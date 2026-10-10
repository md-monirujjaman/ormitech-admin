import {
  Bot,
  Building2,
  CreditCard,
  FileText,
  KeyRound,
  Radio,
  ScrollText,
  ShieldAlert,
  UserCog,
  Users,
} from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/apiError';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { AuditLogEntry } from '@/types/audit';
import { useAuditLogs } from '../hooks';

const FEED_SIZE = 10;

/** The action family an entry belongs to, by prefix — the same grouping the audit log filter offers. */
const FAMILY_ICON: { prefix: string; icon: typeof Users }[] = [
  { prefix: 'admin.', icon: UserCog },
  { prefix: 'authorization.', icon: ShieldAlert },
  { prefix: 'organization', icon: Building2 },
  { prefix: 'plan', icon: CreditCard },
  { prefix: 'subscription', icon: CreditCard },
  { prefix: 'invoice', icon: FileText },
  { prefix: 'payments', icon: CreditCard },
  { prefix: 'billing', icon: CreditCard },
  { prefix: 'lead', icon: Users },
  { prefix: 'conversation', icon: Radio },
  { prefix: 'usage', icon: Bot },
  { prefix: 'catalog', icon: KeyRound },
  { prefix: 'audit_log', icon: ScrollText },
];

const iconFor = (action: string) =>
  FAMILY_ICON.find((family) => action.startsWith(family.prefix))?.icon ?? ScrollText;

/**
 * The action, in words rather than in its stored form.
 *
 * `organization.status_changed` reads as "organization status changed", which is what the line is for. The
 * exact action name stays available on the audit log page, where it is what an operator filters on.
 */
const describeAction = (action: string): string => {
  const [family = action, ...rest] = action.split('.');
  const subject = family.replace(/_/g, ' ');
  const verb = rest.join('.').replace(/_/g, ' ');
  return verb ? `${subject} ${verb}` : subject;
};

function formatRelativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const isForbidden = (error: unknown): boolean => axios.isAxiosError(error) && error.response?.status === 403;

/**
 * The newest entries from the administrator audit trail, on the dashboard.
 *
 * This is the one activity feed the platform actually records: no table stores customer-side platform events,
 * so what can honestly be shown here is what administrators did. Each line names who, what, and when.
 *
 * The trail is `super_admin` only, and the dashboard is where every administrator lands — so a 403 is not an
 * error here. It is a quiet note that the feed needs the role, because an administrator seeing a red failure
 * box on their own home page would reasonably think something is broken.
 */
export function RecentActivity() {
  const activityQuery = useAuditLogs({ page: 1, limit: FEED_SIZE });
  const entries = activityQuery.data?.items ?? [];

  if (isForbidden(activityQuery.error)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Activity needs the super_admin role"
        description="The administrator audit trail is readable by super admins only, so this feed is empty for your account."
      />
    );
  }

  if (activityQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load recent activity"
        description={apiErrorMessage(activityQuery.error, 'The OrmiTech API refused the request.')}
        onRetry={() => activityQuery.refetch()}
      />
    );
  }

  if (activityQuery.isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Nothing recorded yet"
        description="Entries appear here as soon as an administrator reads or changes anything."
      />
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {entries.map((entry) => (
          <ActivityLine key={entry.id} entry={entry} />
        ))}
      </ul>

      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={ROUTES.auditLogs}>View the full audit log</Link>
      </Button>
    </div>
  );
}

function ActivityLine({ entry }: { entry: AuditLogEntry }) {
  const Icon = iconFor(entry.action);
  const denied = entry.result === 'denied';

  return (
    <li className="flex gap-3">
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          denied ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium text-foreground">
          {describeAction(entry.action)}
          {denied && <span className="ml-1.5 text-xs font-normal text-destructive">refused</span>}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {entry.adminEmail ?? 'an administrator'}
          {entry.detail ? ` · ${entry.detail}` : ''}
        </p>
        <p className="text-xs text-muted-foreground/70">
          <time dateTime={entry.createdAt} title={new Date(entry.createdAt).toLocaleString()}>
            {formatRelativeTime(entry.createdAt)}
          </time>
        </p>
      </div>
    </li>
  );
}
