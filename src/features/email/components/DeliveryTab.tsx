import { RefreshCw, RotateCcw, Send } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiErrorMessage } from '@/lib/apiError';
import { useDeliveryLogs, useRetryDelivery, useTemplates } from '../hooks';
import { formatWhen } from '../lib/format';
import { DELIVERY_LABEL, errorCodeLabel } from '../lib/status';
import type { DeliveryLog, DeliveryStatus } from '../types';

const VARIANT = { sent: 'success', queued: 'warning', failed: 'destructive' } as const;

/**
 * What was sent and how it went, newest first. Recipients are masked and failures are short codes: the API never stores a message.
 * A failed message can be run again while the queue still holds it (about a week); after that the API says so.
 */
export function DeliveryTab({ canWrite }: { canWrite: boolean }) {
  const [status, setStatus] = useState<DeliveryStatus | 'all'>('all');
  const [template, setTemplate] = useState('all');
  const filters = { ...(status === 'all' ? {} : { status }), ...(template === 'all' ? {} : { template }) };
  const query = useDeliveryLogs(filters);
  const templates = useTemplates();
  const retry = useRetryDelivery();
  const [retrying, setRetrying] = useState<DeliveryLog | null>(null);
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(value) => setStatus(value as DeliveryStatus | 'all')}>
          <SelectTrigger className="w-44" aria-label="Delivery status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {(Object.keys(DELIVERY_LABEL) as DeliveryStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {DELIVERY_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger className="w-64" aria-label="Template">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {(templates.data ?? []).map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant={status === 'failed' ? 'secondary' : 'outline'} aria-pressed={status === 'failed'} onClick={() => setStatus(status === 'failed' ? 'all' : 'failed')}>
          Failed only
        </Button>
        <Button type="button" variant="ghost" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className="size-4" aria-hidden />
          Refresh
        </Button>
      </div>

      {retry.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {apiErrorMessage(retry.error, 'The message could not be retried.')}
        </p>
      ) : null}
      {retry.isSuccess ? (
        <p className="text-sm text-success" role="status">
          Queued to run again. Refresh in a moment to see the result.
        </p>
      ) : null}

      {query.isError ? (
        <ErrorState title="Couldn't load the delivery log" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Send} title="Nothing here" description={status === 'failed' ? 'No emails have failed.' : 'No emails match these filters yet.'} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Attempts</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="hidden lg:table-cell">Sent</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="font-medium">{row.templateKey}</span>
                    {row.isTest ? (
                      <Badge variant="secondary" className="ml-2">
                        TEST
                      </Badge>
                    ) : null}
                    {/* On a phone the Status column is hidden, so the status sits under the name. */}
                    <div className="mt-1 sm:hidden">
                      <Badge variant={VARIANT[row.status]}>{DELIVERY_LABEL[row.status]}</Badge>
                      {row.errorCode ? <p className="mt-1 text-xs text-muted-foreground">{errorCodeLabel(row.errorCode)}</p> : null}
                      {canWrite && row.status === 'failed' && row.retryable ? (
                        <Button type="button" size="sm" variant="outline" className="mt-2" aria-label={`Retry the email to ${row.recipient}`} onClick={() => setRetrying(row)}>
                          <RotateCcw className="size-4" aria-hidden />
                          Retry
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.recipient}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={VARIANT[row.status]}>{DELIVERY_LABEL[row.status]}</Badge>
                    {row.errorCode ? <p className="mt-1 text-xs text-muted-foreground">{errorCodeLabel(row.errorCode)}</p> : null}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{row.attempts}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatWhen(row.createdAt)}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatWhen(row.sentAt)}</TableCell>
                  <TableCell className="hidden text-right sm:table-cell">
                    {canWrite && row.status === 'failed' && row.retryable ? (
                      <Button type="button" size="sm" variant="outline" aria-label={`Retry the email to ${row.recipient}`} onClick={() => setRetrying(row)}>
                        <RotateCcw className="size-4" aria-hidden />
                        Retry
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={retrying !== null}
        onOpenChange={(open) => !open && setRetrying(null)}
        title="Retry this email?"
        description={`It is sent again to ${retrying?.recipient ?? ''}. This works while the queue still holds the message (about a week); after that it cannot be rebuilt.`}
        confirmLabel="Retry"
        isPending={retry.isPending}
        onConfirm={() => retrying && retry.mutate(retrying.id, { onSettled: () => setRetrying(null) })}
      />
    </div>
  );
}
