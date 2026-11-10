import { LockKeyhole, RefreshCw } from 'lucide-react';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/apiError';
import { useAuthStore } from '@/store/authStore';
import { AttentionCard } from './components/AttentionCard';
import { OutboxCard } from './components/OutboxCard';
import { QueuesCard } from './components/QueuesCard';
import { RedisCard } from './components/RedisCard';
import { MONITORING_REFRESH_MS, refusalStatus, useMonitoring } from './hooks';

const time = (iso: string | undefined) => (iso ? new Date(iso).toLocaleTimeString() : '—');

function Restricted({ expired = false }: { expired?: boolean }) {
  return (
    <EmptyState
      icon={LockKeyhole}
      title={expired ? 'Your session has ended' : 'Super admins only'}
      description={
        expired
          ? 'Sign in again to see the monitoring panel.'
          : 'Redis, queue and outbox status is limited to super admins. Your role can open this page, but the API will not show you this data.'
      }
    />
  );
}

/**
 * Redis, queue and outbox status from `GET /admin/monitoring`, refreshed every 30 seconds.
 *
 * Who may read it is decided by the API (`super_admin`). The role check here only spares everyone else a request that would be
 * refused, and the 403 handling is what shows when the API refuses anyway: nothing on this screen is a security boundary.
 */
export function MonitoringPanel() {
  const isSuperAdmin = useAuthStore((state) => state.admin?.roles.includes('SUPER_ADMIN') ?? false);
  const query = useMonitoring(isSuperAdmin);
  const snapshot = query.data;
  const refusal = refusalStatus(query.error);

  if (!isSuperAdmin || refusal === 403) return <Restricted />;
  if (refusal === 401) return <Restricted expired />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {snapshot ? `Checked ${time(snapshot.checkedAt)} · refreshes every ${MONITORING_REFRESH_MS / 1000} seconds` : 'Waiting for the first check…'}
        </p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={`size-3.5 ${query.isFetching ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </Button>
      </div>

      {query.isLoading ? (
        <div className="space-y-6" role="status" aria-label="Loading monitoring status">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : !snapshot ? (
        <ErrorState title="Couldn't load monitoring status" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p role="alert" className="rounded-lg border border-warning/50 bg-warning/10 px-4 py-2.5 text-sm text-foreground">
              The last refresh failed ({apiErrorMessage(query.error, 'the API did not answer')}). Showing the check from {time(snapshot.checkedAt)}.
            </p>
          )}
          <AttentionCard snapshot={snapshot} />
          <div className="grid gap-6 lg:grid-cols-2">
            <RedisCard redis={snapshot.redis} />
            <OutboxCard outbox={snapshot.outbox} />
          </div>
          <QueuesCard queues={snapshot.queues} attention={snapshot.attention} />
        </>
      )}
    </div>
  );
}
