import { CheckCircle2, Clock, Headset, Inbox, Paperclip, Search, Timer, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import { ROUTES } from '@/lib/constants';
import { useAccept, useMarkNotificationsRead, useSupportList, useSupportMe, useSupportNotifications, useSupportOverview } from '../hooks';
import { formatSeconds, formatWhen, STATUS_INFO } from '../status';
import type { SessionListItem, SupportScope } from '../types';

const TABS: Array<{ id: SupportScope; label: string; privileged?: boolean }> = [
  { id: 'available', label: 'Available requests' },
  { id: 'mine', label: 'My assigned support' },
  { id: 'active', label: 'Active conversations' },
  { id: 'waiting', label: 'Waiting for customer' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'Support history', privileged: true },
];

function Stat({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Inbox }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function Row({ item, onAccept, accepting, error }: { item: SessionListItem; onAccept: (id: string) => void; accepting: boolean; error: string | null }) {
  const status = STATUS_INFO[item.status];
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`${ROUTES.fastSupport}/${item.id}`} className="truncate text-sm font-semibold hover:underline">
              {item.subject}
            </Link>
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant="outline">{item.categoryLabel}</Badge>
            {item.hasAttachment && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Has an attachment">
                <Paperclip className="size-3" aria-hidden /> Attachment
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.descriptionPreview}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            <span>{item.organizationName}</span>
            <span>{formatWhen(item.createdAt)}</span>
            {item.assignedModeratorName && <span>{item.assignedToMe ? 'You are handling this' : `Handled by ${item.assignedModeratorName}`}</span>}
            <span>AI {item.aiEnabled ? 'on' : 'off'}</span>
          </p>
          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`${ROUTES.fastSupport}/${item.id}`}>Open</Link>
          </Button>
          {item.canAccept && (
            <Button size="sm" disabled={accepting} onClick={() => onAccept(item.id)}>
              {accepting ? 'Accepting…' : 'Accept'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/** The support desk: how things stand, and the requests by what a moderator needs next. Everything comes from the database. */
export default function SupportDeskPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const me = useSupportMe();
  const [scope, setScope] = useState<SupportScope>('available');
  const [search, setSearch] = useState('');
  const overview = useSupportOverview();
  const list = useSupportList(scope, search.trim());
  const notifications = useSupportNotifications();
  const markRead = useMarkNotificationsRead();
  const accept = useAccept();
  const [refused, setRefused] = useState<{ id: string; message: string } | null>(null);

  const privileged = Boolean(me.data?.isSuperAdmin || me.data?.permissions.includes('support.history.view'));
  const tabs = TABS.filter((tab) => !tab.privileged || privileged);
  const stats = overview.data;

  const onAccept = async (id: string) => {
    setRefused(null);
    try {
      await accept.mutateAsync(id);
      navigate(`${ROUTES.fastSupport}/${id}`);
    } catch (error) {
      // Somebody else got there first (409), or the permission was taken away: the list refreshes and the reason stays on the row.
      setRefused({ id, message: apiErrorMessage(error, 'This request could not be accepted.') });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Desk"
        description="Fast Support requests from clients. The first moderator to accept a request takes it."
        showMockNotice={false}
        actions={
          <>
            {(notifications.data?.unread ?? 0) > 0 && (
              <Button variant="outline" size="sm" disabled={markRead.isPending} onClick={() => markRead.mutate()}>
                Mark {notifications.data?.unread} notifications read
              </Button>
            )}
            {can('fastsupport.moderators') && (
              <Button variant="outline" size="sm" asChild>
                <Link to={ROUTES.fastSupportModerators}>
                  <Users className="size-4" aria-hidden /> Moderators
                </Link>
              </Button>
            )}
          </>
        }
      />

      {overview.isError ? (
        <ErrorState title="Couldn't load the overview" description={apiErrorMessage(overview.error, 'The OrmiTech API refused the request.')} onRetry={() => overview.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Total requests" value={stats?.totalRequests ?? '—'} icon={Inbox} />
          <Stat label="Pending" value={stats?.pendingRequests ?? '—'} icon={Clock} />
          <Stat label="Active sessions" value={stats?.activeSessions ?? '—'} icon={Headset} />
          <Stat label="Assigned to you" value={stats?.assignedSessions ?? '—'} icon={Users} />
          <Stat label="Resolved" value={stats?.resolvedSessions ?? '—'} icon={CheckCircle2} />
          <Stat label="Avg. first reply (30 d)" value={stats ? formatSeconds(stats.averageResponseSeconds) : '—'} icon={Timer} />
        </div>
      )}

      <div className="space-y-4">
        <Tabs value={scope} onValueChange={(value) => setScope(value as SupportScope)}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search requests" className="pl-9" placeholder="Search subject, workspace or request id" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        {list.isError ? (
          <ErrorState title="Couldn't load the requests" description={apiErrorMessage(list.error, 'The OrmiTech API refused the request.')} onRetry={() => list.refetch()} />
        ) : list.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (list.data?.items ?? []).length === 0 ? (
          <EmptyState icon={Inbox} title={scope === 'available' ? 'No requests are waiting' : 'Nothing here'} description={search ? 'No request matches your search.' : 'New requests appear here the moment a client asks for help.'} />
        ) : (
          <div className="grid gap-3">
            {list.data!.items.map((item) => (
              <Row key={item.id} item={item} onAccept={onAccept} accepting={accept.isPending && accept.variables === item.id} error={refused?.id === item.id ? refused.message : null} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
