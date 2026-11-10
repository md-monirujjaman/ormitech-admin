import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { RedisMonitoring } from '@/types/monitoring';
import { formatBytes, onOff } from '../format';
import { StatusPill, type Tone } from './StatusPill';

const STATUS: Record<RedisMonitoring['status'], { label: string; tone: Tone }> = {
  up: { label: 'Connected', tone: 'ok' },
  down: { label: 'Down', tone: 'bad' },
  unavailable: { label: 'Unreachable', tone: 'bad' },
  not_configured: { label: 'Not configured', tone: 'muted' },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function RedisCard({ redis }: { redis: RedisMonitoring }) {
  const status = STATUS[redis.status];
  const { configuration, memory } = redis;
  const share = memory?.usedBytes != null && memory.maxBytes ? Math.min(100, Math.round((memory.usedBytes / memory.maxBytes) * 100)) : null;
  const evicted = memory?.evictedKeys ?? null;
  const persistence = onOff(configuration?.persistenceOn);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">Redis</CardTitle>
          <CardDescription>Holds every queue. If it loses jobs, work is lost.</CardDescription>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </CardHeader>
      <CardContent>
        {redis.status !== 'up' ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {redis.status === 'not_configured' ? 'Redis is not configured for this deployment.' : 'Redis did not answer, so its settings and memory cannot be shown.'}
          </p>
        ) : (
          <dl>
            <Row label="Response time">{redis.responseTimeMs === null ? '—' : `${redis.responseTimeMs} ms`}</Row>
            <Row label="Eviction policy (maxmemory-policy)">
              {configuration?.maxmemoryPolicy ?? 'Unknown'}
              {configuration?.evictionSafe != null && <StatusPill tone={configuration.evictionSafe ? 'ok' : 'bad'}>{configuration.evictionSafe ? 'Safe' : 'Unsafe'}</StatusPill>}
            </Row>
            <Row label="Persistence">
              <StatusPill tone={persistence.tone}>{persistence.label}</StatusPill>
              <span className="text-xs font-normal text-muted-foreground">
                AOF {onOff(configuration?.appendonly).label.toLowerCase()} · Snapshots {onOff(configuration?.snapshots).label.toLowerCase()}
              </span>
            </Row>
            <Row label="Memory">
              {formatBytes(memory?.usedBytes)}
              <span className="font-normal text-muted-foreground">{memory?.maxBytes ? `of ${formatBytes(memory.maxBytes)}` : 'no limit set'}</span>
            </Row>
            {share !== null && (
              <div className="pb-2.5">
                <Progress value={share} aria-label="Redis memory used" indicatorClassName={share > 90 ? 'bg-destructive' : share > 75 ? 'bg-warning' : 'bg-success'} />
              </div>
            )}
            <Row label="Evicted keys">
              {evicted === null ? '—' : evicted.toLocaleString()}
              {evicted !== null && evicted > 0 && <StatusPill tone="bad">Keys lost</StatusPill>}
            </Row>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
