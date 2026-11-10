import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { OutboxMonitoring } from '@/types/monitoring';
import { formatAge } from '../format';
import { StatusPill, type Tone } from './StatusPill';

const STATUS: Record<OutboxMonitoring['status'], { label: string; tone: Tone }> = {
  ok: { label: 'Healthy', tone: 'ok' },
  off: { label: 'Off, nothing waiting', tone: 'muted' },
  backlog: { label: 'Backlog', tone: 'warn' },
  stuck: { label: 'Stuck', tone: 'bad' },
  unavailable: { label: 'Unavailable', tone: 'bad' },
};

function Tile({ label, value, tone }: { label: string; value: number; tone?: Tone }) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone === 'bad' && value > 0 ? 'text-destructive' : 'text-foreground'}`}>{value.toLocaleString()}</p>
    </div>
  );
}

export function OutboxCard({ outbox }: { outbox: OutboxMonitoring }) {
  const status = STATUS[outbox.status];
  const { counts } = outbox;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">Job outbox</CardTitle>
          <CardDescription>Jobs written to PostgreSQL first, so they survive a Redis failure.</CardDescription>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <StatusPill tone={outbox.enabled ? 'ok' : 'muted'}>{outbox.enabled ? 'Enabled' : 'Disabled'}</StatusPill>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {counts === null ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">The outbox could not be read, so its counts are not shown.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Tile label="Pending" value={counts.pending} />
            <Tile label="Enqueued" value={counts.enqueued} />
            <Tile label="Processing" value={counts.processing} />
            <Tile label="Failed" value={counts.failed} tone="bad" />
            <Tile label="Done" value={counts.done} />
          </div>
        )}
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <dt className="text-muted-foreground">Oldest pending</dt>
            <dd className="font-medium text-foreground">{outbox.oldestPendingAgeSeconds === null ? 'Nothing pending' : formatAge(outbox.oldestPendingAgeSeconds)}</dd>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <dt className="text-muted-foreground">Stuck rows</dt>
            <dd className="flex items-center gap-2 font-medium text-foreground">
              {outbox.stuck === null ? '—' : outbox.stuck.toLocaleString()}
              {outbox.stuck !== null && outbox.stuck > 0 && <StatusPill tone="bad">Stuck</StatusPill>}
            </dd>
          </div>
        </dl>
        {!outbox.enabled && counts !== null && counts.pending + counts.enqueued + counts.processing > 0 && (
          <p className="text-xs text-muted-foreground">The outbox is switched off, but rows from before are still waiting in it.</p>
        )}
      </CardContent>
    </Card>
  );
}
