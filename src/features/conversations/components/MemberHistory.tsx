import { useState } from 'react';
import { Activity, MonitorSmartphone } from 'lucide-react';
import { isMockDataSource } from '@/api/dataSource';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiErrorMessage } from '@/lib/apiError';
import { useMemberActivity, useMemberSessions } from '../hooks';

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** A change as `audit_logs` recorded it: `{ field: { from, to } }`. Rendered as one line per field. */
function Changes({ changes }: { changes: Record<string, unknown> }) {
  const entries = Object.entries(changes ?? {});
  if (entries.length === 0) return null;

  return (
    <ul className="mt-1 space-y-0.5">
      {entries.map(([field, change]) => {
        const { from, to } = (change ?? {}) as { from?: unknown; to?: unknown };
        return (
          <li key={field} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{field}</span>: {describe(from)} → {describe(to)}
          </li>
        );
      })}
    </ul>
  );
}

const describe = (value: unknown): string => {
  if (value === null || value === undefined) return 'none';
  if (typeof value === 'string') return value || 'empty';
  return JSON.stringify(value);
};

/**
 * One team member's history: what they did inside this organization, and how they signed in.
 *
 * Both come from the real API and have no fixture behind them, so on the fixture data source this says so
 * rather than inventing a timeline — a fabricated access history is the last thing a support investigation
 * should be reading.
 */
export function MemberHistory({ organizationId, memberId }: { organizationId: string; memberId: string }) {
  const [activityPage, setActivityPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);

  const activityQuery = useMemberActivity(isMockDataSource ? undefined : organizationId, memberId, activityPage);
  const sessionsQuery = useMemberSessions(isMockDataSource ? undefined : organizationId, memberId, sessionPage);

  if (isMockDataSource) {
    return (
      <EmptyState
        icon={Activity}
        title="Not available on fixture data"
        description="Activity and sign-in history are read from the API. Set VITE_ADMIN_DATA_SOURCE=api to see them."
      />
    );
  }

  const activity = activityQuery.data;
  const sessions = sessionsQuery.data;

  return (
    <Tabs defaultValue="activity" className="mt-2">
      <TabsList>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="sessions">Sign-ins</TabsTrigger>
      </TabsList>

      <TabsContent value="activity" className="mt-3">
        {activityQuery.isError ? (
          <ErrorState
            title="Couldn't load activity"
            description={apiErrorMessage(activityQuery.error, 'The OrmiTech API refused the request.')}
            onRetry={() => activityQuery.refetch()}
          />
        ) : activityQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (activity?.items.length ?? 0) === 0 ? (
          <EmptyState icon={Activity} title="No recorded activity" description="This member has not changed anything yet." />
        ) : (
          <>
            <ol className="space-y-3">
              {activity?.items.map((entry) => (
                <li key={entry.id} className="border-l-2 border-border pl-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{entry.action}</span>
                    <Badge variant="outline">{entry.entityType}</Badge>
                    <time className="text-xs text-muted-foreground" dateTime={entry.createdAt}>
                      {formatDateTime(entry.createdAt)}
                    </time>
                  </div>
                  <Changes changes={entry.changes} />
                </li>
              ))}
            </ol>
            {(activity?.meta.totalPages ?? 1) > 1 && (
              <PageSteps
                page={activity!.meta.page}
                totalPages={activity!.meta.totalPages}
                onChange={setActivityPage}
              />
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="sessions" className="mt-3">
        {sessionsQuery.isError ? (
          <ErrorState
            title="Couldn't load sign-ins"
            description={apiErrorMessage(sessionsQuery.error, 'The OrmiTech API refused the request.')}
            onRetry={() => sessionsQuery.refetch()}
          />
        ) : sessionsQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (sessions?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={MonitorSmartphone}
            title="No sign-ins recorded"
            description="This member has never signed in."
          />
        ) : (
          <>
            <ul className="space-y-3">
              {sessions?.items.map((session) => (
                <li key={session.id} className="border-l-2 border-border pl-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{session.ipAddress ?? 'unknown address'}</span>
                    {session.revokedAt ? (
                      <Badge variant="secondary">ended{session.revokedReason ? `: ${session.revokedReason}` : ''}</Badge>
                    ) : (
                      <Badge variant="success">active</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{session.userAgent ?? 'unknown device'}</p>
                  <p className="text-xs text-muted-foreground">
                    started {formatDateTime(session.createdAt)} · last used {formatDateTime(session.lastUsedAt)}
                  </p>
                </li>
              ))}
            </ul>
            {(sessions?.meta.totalPages ?? 1) > 1 && (
              <PageSteps page={sessions!.meta.page} totalPages={sessions!.meta.totalPages} onChange={setSessionPage} />
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

/** A compact pager: this lives inside a dialog, where the full Pagination bar would not fit. */
function PageSteps({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
      <button type="button" className="hover:text-foreground disabled:opacity-40" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="hover:text-foreground disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
