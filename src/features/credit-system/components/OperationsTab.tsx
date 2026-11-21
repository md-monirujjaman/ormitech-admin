import { Fragment, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { apiErrorMessage } from '@/lib/apiError';
import { COST_REASON_LABEL, COST_VERIFICATION_LABEL, formatCredits, formatUsd, formatWhen, NOT_AVAILABLE, shortId, STATUS_LABEL, STATUS_TONE } from '../format';
import { useOperations, useTurn } from '../hooks';
import type { Filters, Operation } from '../types';
import { Problem } from './shared';

/** A step that did not happen for this request (no hold, no charge, no release) is a dash: it is not a cost that is unknown. */
const step = (value: string | null) => (value === null ? '—' : formatCredits(value));

const cost = (row: Operation) => (row.providerCost === null ? <span className="text-muted-foreground">{NOT_AVAILABLE}</span> : `${row.providerCost.replace(/0+$/, '').replace(/\.$/, '')} ${row.providerCostUnit ?? ''}`);

function OperationRow({ row, onTurn }: { row: Operation; onTurn: (turnId: string) => void }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-xs">{formatWhen(row.createdAt)}</TableCell>
      <TableCell>
        {row.turnId ? (
          <button type="button" className="font-mono text-xs text-primary underline-offset-2 hover:underline" aria-label={`Open turn ${row.turnId}`} onClick={() => onTurn(row.turnId!)}>
            {shortId(row.turnId)}
          </button>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="font-mono text-xs" title={row.attemptId ?? undefined}>{shortId(row.attemptId)}</TableCell>
      <TableCell>{row.organizationName ?? shortId(row.organizationId)}</TableCell>
      <TableCell className="text-xs">{row.kind ?? '—'}</TableCell>
      <TableCell className="font-mono text-xs">
        {row.model ?? '—'}
        {row.modelRole && <span className="ml-1 text-muted-foreground">({row.modelRole})</span>}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">{cost(row)}</TableCell>
      <TableCell className="whitespace-nowrap text-xs">{row.verifiedUsd === null ? <span className="text-muted-foreground">{NOT_AVAILABLE}</span> : formatUsd(row.verifiedUsd)}</TableCell>
      <TableCell>
        <Badge variant={row.costVerification === 'verified_usd' ? 'success' : row.costVerification === 'unit_unverified' ? 'warning' : 'outline'}>{COST_VERIFICATION_LABEL[row.costVerification]}</Badge>
        {row.costReason && <p className="mt-1 text-xs text-muted-foreground">{COST_REASON_LABEL[row.costReason] ?? row.costReason}</p>}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs tabular-nums">
        <span title="Reserved">{step(row.reservedCredits)}</span> / <span title="Settled">{step(row.settledCredits)}</span> / <span title="Released">{step(row.releasedCredits)}</span>
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
      </TableCell>
    </TableRow>
  );
}

function TurnDialog({ turnId, onClose }: { turnId: string | null; onClose: () => void }) {
  const query = useTurn(turnId);
  return (
    <Dialog open={turnId !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Customer turn</DialogTitle>
          <DialogDescription className="font-mono text-xs">{turnId}</DialogDescription>
        </DialogHeader>
        {query.isError ? (
          <Problem>{apiErrorMessage(query.error, 'The turn could not be loaded.')}</Problem>
        ) : query.isLoading || !query.data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-3">
            <dl className="grid gap-2 text-sm sm:grid-cols-5">
              {[
                ['Attempts', query.data.attempts],
                ['Failed', query.data.failedAttempts],
                ['Verified cost', query.data.verifiedAttempts],
                ['Unresolved cost', query.data.unresolvedAttempts],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-muted-foreground">Verified cost (USD)</dt>
                <dd className="font-semibold">{formatUsd(query.data.verifiedUsd)}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">The cost of every verified attempt is added first; markup, conversion and rounding are applied once to that total when the turn is settled. An attempt with no verified cost is never charged and never counted as zero.</p>
            <div className="max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Turn</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Provider cost</TableHead>
                    <TableHead>Cost (USD)</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Reserved / settled / released</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.items.map((row) => (
                    <Fragment key={row.id}>
                      <OperationRow row={row} onTurn={() => undefined} />
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Every AI request, with what happened to its reservation and its cost: reserved, executed, settled, released, pending reconciliation,
 * failed. Visibility only: nothing here charges, settles or releases anything.
 */
export function OperationsTab({ filters }: { filters: Filters }) {
  const query = useOperations(filters);
  const [turn, setTurn] = useState<string | null>(null);
  if (query.isError) return <LoadFailed error={query.error} what="the AI operations" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data) return <Skeleton className="h-96 w-full" />;
  const rows = query.data.pages.flatMap((page) => page.items);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservation, settlement and reconciliation</CardTitle>
        <CardDescription>Newest first. “Reserved / settled / released” are credits; a dash means that step did not happen for the request. A request whose provider cost is unknown stays pending reconciliation: it is never charged, estimated or shown as zero.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI request matches these filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Turn</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Feature</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Provider cost</TableHead>
                <TableHead>Cost (USD)</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Reserved / settled / released</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <OperationRow key={row.id} row={row} onTurn={setTurn} />
              ))}
            </TableBody>
          </Table>
        )}
        {query.hasNextPage && (
          <Button type="button" variant="outline" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        )}
      </CardContent>
      <TurnDialog turnId={turn} onClose={() => setTurn(null)} />
    </Card>
  );
}
