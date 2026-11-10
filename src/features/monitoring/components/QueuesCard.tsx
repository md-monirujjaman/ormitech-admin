import { Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MonitoringAttention, QueuesMonitoring } from '@/types/monitoring';
import { formatAge, queueLabel } from '../format';
import { StatusPill, type Tone } from './StatusPill';

const STATUS: Record<QueuesMonitoring['status'], { label: string; tone: Tone }> = {
  ok: { label: 'Healthy', tone: 'ok' },
  backlog: { label: 'Backlog', tone: 'warn' },
  unavailable: { label: 'Unavailable', tone: 'bad' },
  not_configured: { label: 'Not configured', tone: 'muted' },
};

const num = 'text-right tabular-nums';

export function QueuesCard({ queues, attention }: { queues: QueuesMonitoring; attention: MonitoringAttention[] }) {
  const status = STATUS[queues.status];
  // The API decides what counts as a backlog; this screen only reads its answer instead of keeping its own thresholds.
  const behind = new Set(attention.filter((item) => item.area === 'queues' && item.code === 'queue_backlog').map((item) => item.queue));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">Queues</CardTitle>
          <CardDescription>
            {queues.items.length > 0 ? `${queues.items.length} background queues, as of the last check.` : 'Background work waiting to run.'}
          </CardDescription>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </CardHeader>
      <CardContent>
        {queues.items.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={queues.status === 'not_configured' ? 'Queues are not configured' : queues.status === 'unavailable' ? 'Queue statistics are unavailable' : 'No queues reported'}
            description={
              queues.status === 'not_configured'
                ? 'Redis is not configured, so no background queue exists.'
                : queues.status === 'unavailable'
                  ? 'Redis could not be reached, so nothing is known about the queues.'
                  : 'The API returned no queues.'
            }
            className="py-10"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue</TableHead>
                <TableHead className={num}>Waiting</TableHead>
                <TableHead className={num}>Active</TableHead>
                <TableHead className={num}>Delayed</TableHead>
                <TableHead className={num}>Failed</TableHead>
                <TableHead className={num}>Oldest waiting</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.items.map((item) => {
                const isBehind = behind.has(item.queue);
                return (
                  <TableRow key={item.queue}>
                    <TableCell className="font-medium text-foreground">{queueLabel(item.queue)}</TableCell>
                    <TableCell className={num}>{item.waiting.toLocaleString()}</TableCell>
                    <TableCell className={num}>{item.active.toLocaleString()}</TableCell>
                    <TableCell className={num}>{item.delayed.toLocaleString()}</TableCell>
                    <TableCell className={`${num} ${item.failed > 0 ? 'font-medium text-destructive' : ''}`}>{item.failed.toLocaleString()}</TableCell>
                    <TableCell className={num}>{formatAge(item.oldestWaitingAgeSeconds)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {isBehind && <StatusPill tone="warn">Backlog</StatusPill>}
                        {item.failed > 0 && <StatusPill tone="bad">Failed jobs</StatusPill>}
                        {!isBehind && item.failed === 0 && <StatusPill tone="ok">Healthy</StatusPill>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
