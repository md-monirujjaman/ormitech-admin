import { Activity, CalendarPlus, CircleDot, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Organization } from '@/types/organization';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Known lifecycle facts for this organization. A real activity feed comes from the audit log once ormitech-api
 * records one (see `lib/audit.ts` for the event vocabulary the Admin already emits drafts for) — this tab shows
 * only what the organization record itself states rather than inventing history.
 */
export function ActivityTab({ organization }: { organization: Organization }) {
  const events = [
    { icon: CalendarPlus, label: 'Organization created', at: organization.createdAt },
    { icon: CircleDot, label: `Current status: ${organization.status.charAt(0) + organization.status.slice(1).toLowerCase()}`, at: null },
    organization.lastActivityAt ? { icon: Clock, label: 'Last recorded activity', at: organization.lastActivityAt } : null,
  ].filter(Boolean) as { icon: typeof Activity; label: string; at: string | null }[];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Lifecycle</CardTitle>
          <CardDescription>What the organization record itself tells us.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {events.map((event) => (
              <li key={event.label} className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <event.icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{event.label}</p>
                  {event.at && <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            className="border-0 py-10"
            icon={Activity}
            title="No audit log yet"
            description="Admin actions already produce audit event drafts, but nothing records them until ormitech-api exposes an audit log. Only the server can write trustworthy audit history."
          />
        </CardContent>
      </Card>
    </div>
  );
}
