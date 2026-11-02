import { CircleAlert, CircleCheck, Coins, Plus } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/apiError';
import axios from 'axios';
import { COST_REASON, ENTRY_LABEL, formatCredits, formatDelta, formatWhen, MODE_EXPLANATION, MODE_LABEL, SOURCE_LABEL } from '../format';
import { useAdjustCredits, useBackfillCosts, useCreditsOverview, useExpireCredits, useGrantCredits, useLedger, useReservations, useReverseEntry, useSetCreditMode, useUsageCosts } from '../hooks';
import { reverseSchema } from '../schemas';
import type { CreditBucket, CreditMode, LedgerEntry, UsageCost } from '../types';
import { newKey } from '../idempotency';
import { AdjustDialog, GrantDialog } from './CreditDialogs';

const FOLLOW_PLATFORM = 'platform';
const REVERSIBLE = new Set(['credit', 'debit', 'adjustment', 'expiry']);

type Notice = { message: string; tone: 'success' } | null;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const STATUS_VARIANT = { final: 'success', estimated: 'warning', unpriced: 'outline', no_usage: 'outline', failed: 'destructive' } as const;

/**
 * A workspace's AI credits, for super admins: its wallet by source, its mode, the append-only ledger, what each AI request
 * cost (with the exact prices in force at the time), holds in flight, and the manual acts that change a balance. Nothing is
 * edited in place: a grant, an adjustment or a reversal adds a ledger entry in your name, with the reason you give.
 */
export function OrgCreditsTab({ organizationId, canWrite }: { organizationId: string; canWrite: boolean }) {
  const overview = useCreditsOverview(organizationId);
  const ledger = useLedger(organizationId);
  const costs = useUsageCosts(organizationId);
  const reservations = useReservations(organizationId);
  const grant = useGrantCredits(organizationId);
  const adjust = useAdjustCredits(organizationId);
  const reverse = useReverseEntry(organizationId);
  const setMode = useSetCreditMode(organizationId);
  const expire = useExpireCredits(organizationId);
  const backfill = useBackfillCosts(organizationId);

  const [notice, setNotice] = useState<Notice>(null);
  const [granting, setGranting] = useState(false);
  const [adjusting, setAdjusting] = useState<CreditBucket | null>(null);
  const [reversing, setReversing] = useState<LedgerEntry | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reverseProblem, setReverseProblem] = useState<string | null>(null);
  const [reverseKey, setReverseKey] = useState(newKey);
  const [pendingMode, setPendingMode] = useState<CreditMode | typeof FOLLOW_PLATFORM | null>(null);
  const [maintenance, setMaintenance] = useState<'expire' | 'backfill' | null>(null);

  if (overview.isError) {
    if (axios.isAxiosError(overview.error) && overview.error.response?.status === 403) {
      return <EmptyState icon={Coins} title="Super admins only" description="AI credits are managed by super admins. Ask one if you need access." />;
    }
    return <ErrorState title="Couldn’t load the AI credits" description={apiErrorMessage(overview.error, 'The OrmiTech API refused the request.')} onRetry={() => void overview.refetch()} />;
  }
  if (overview.isLoading || !overview.data) return <Skeleton className="h-96 w-full" />;
  const { mode, wallet, reconciliation } = overview.data;
  const entries = ledger.data?.pages.flatMap((page) => page.items) ?? [];
  const reversed = new Set(entries.flatMap((entry) => (entry.reversesId ? [entry.reversesId] : [])));
  const costItems = costs.data?.pages.flatMap((page) => page.items) ?? [];
  const succeeded = (message: string) => setNotice({ message, tone: 'success' });

  const openReverse = (entry: LedgerEntry) => {
    reverse.reset();
    setReverseReason('');
    setReverseProblem(null);
    setReverseKey(newKey());
    setReversing(entry);
  };
  const runReverse = () => {
    if (!reversing) return;
    const parsed = reverseSchema.safeParse({ reason: reverseReason });
    if (!parsed.success) return setReverseProblem(parsed.error.issues[0]?.message ?? 'Say why');
    setReverseProblem(null);
    reverse.mutate(
      { ledgerEntryId: reversing.id, reason: parsed.data.reason, idempotencyKey: reverseKey },
      {
        onSuccess: (result) => {
          setReversing(null);
          succeeded(result.replay ? 'That reversal was already made.' : 'The entry was reversed.');
        },
      },
    );
  };

  const modeChoice = mode.workspace ?? FOLLOW_PLATFORM;

  return (
    <div className="space-y-6">
      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-md border border-success/40 bg-success/10 p-3 text-sm">
          <p>{notice.message}</p>
          <button type="button" aria-label="Dismiss" className="text-muted-foreground hover:text-foreground" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Wallet</CardTitle>
              <CardDescription>Credit by source. Held credit is reserved for AI requests in flight.</CardDescription>
            </div>
            {canWrite && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { grant.reset(); setGranting(true); }}>
                  <Plus className="size-4" aria-hidden />
                  Grant credits
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMaintenance('expire')}>
                  Run expiry
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMaintenance('backfill')}>
                  Backfill cost snapshots
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Available now" value={formatCredits(wallet.available)} />
            <Stat label="Held for requests in flight" value={formatCredits(wallet.reserved)} />
            <Stat label="Expired, not yet written off" value={formatCredits(wallet.expiredUnswept)} />
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Books</p>
              {reconciliation.ok ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-success">
                  <CircleCheck className="size-4" aria-hidden /> Reconciled
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <CircleAlert className="size-4" aria-hidden /> {reconciliation.mismatches.length} mismatch{reconciliation.mismatches.length === 1 ? '' : 'es'}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Every balance against the ledger</p>
            </div>
          </div>

          {!reconciliation.ok && (
            <div role="alert" className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-foreground">A balance does not match its ledger. Do not adjust it by hand; report it.</p>
              <ul className="font-mono text-xs">
                {reconciliation.mismatches.map((mismatch) => (
                  <li key={`${mismatch.bucketId}-${mismatch.check}`}>
                    {mismatch.bucketId.slice(0, 8)} {mismatch.check}: stored {formatCredits(mismatch.stored)}, ledger says {formatCredits(mismatch.expected)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {wallet.bySource.map((source) => (
              <div key={source.source} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{SOURCE_LABEL[source.source]}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatCredits(source.balance)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCredits(source.available)} free · {formatCredits(source.reserved)} held
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Mode: <Badge variant={mode.effective === 'enforce' ? 'destructive' : mode.effective === 'observe' ? 'warning' : 'outline'}>{MODE_LABEL[mode.effective]}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {mode.workspace ? `This workspace is set to ${MODE_LABEL[mode.workspace]}.` : `Following the platform (${MODE_LABEL[mode.platform]}).`} {MODE_EXPLANATION[mode.effective]}
                </p>
              </div>
              {canWrite && (
                <Select value={modeChoice} onValueChange={(value) => { setMode.reset(); setPendingMode(value as CreditMode | typeof FOLLOW_PLATFORM); }}>
                  <SelectTrigger className="w-56" aria-label="Workspace mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FOLLOW_PLATFORM}>Follow the platform</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="observe">Observe</SelectItem>
                    <SelectItem value="enforce" disabled={!mode.enforceAllowed && mode.workspace !== 'enforce'}>
                      Enforce{mode.enforceAllowed || mode.workspace === 'enforce' ? '' : ' (needs recovery confirmed)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {mode.effective === 'off' && mode.workspace === null && mode.platform !== 'off' && <p className="text-xs text-warning">The platform mode is not in effect because the credit conversion is not set.</p>}
          </div>

          {wallet.buckets.length === 0 ? (
            <EmptyState icon={Coins} title="No credit yet" description="This workspace has no credit buckets. Grant some, or leave it: with the mode off nothing needs it." className="py-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Held</TableHead>
                  <TableHead className="text-right">Free</TableHead>
                  {canWrite && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallet.buckets.map((bucket) => (
                  <TableRow key={bucket.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{SOURCE_LABEL[bucket.source]}</div>
                      {bucket.label && <div className="text-xs text-muted-foreground">{bucket.label}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{bucket.expiresAt ? <span className={bucket.expired ? 'text-destructive' : ''}>{formatWhen(bucket.expiresAt)}{bucket.expired ? ' (expired)' : ''}</span> : <span className="text-muted-foreground">never</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCredits(bucket.balance)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCredits(bucket.reserved)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCredits(bucket.available)}</TableCell>
                    {canWrite && (
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" aria-label={`Adjust ${SOURCE_LABEL[bucket.source]} bucket ${bucket.label ?? bucket.id.slice(0, 8)}`} onClick={() => { adjust.reset(); setAdjusting(bucket); }}>
                          Adjust
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
          <CardDescription>Every movement of credit, newest first. Entries are never edited or deleted; a mistake is corrected by a reversal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ledger.isError ? (
            <ErrorState title="Couldn’t load the ledger" description={apiErrorMessage(ledger.error, 'The API refused the request.')} onRetry={() => void ledger.refetch()} />
          ) : ledger.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : entries.length === 0 ? (
            <EmptyState icon={Coins} title="Nothing in the ledger" description="No credit has moved for this workspace." className="py-8" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Held</TableHead>
                    <TableHead className="text-right">Balance after</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Reason</TableHead>
                    {canWrite && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatWhen(entry.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">{ENTRY_LABEL[entry.entryType] ?? entry.entryType}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{entry.deltaBalance === '0.00000000' ? '—' : formatDelta(entry.deltaBalance)}</TableCell>
                      <TableCell className="text-right tabular-nums">{entry.deltaReserved === '0.00000000' ? '—' : formatDelta(entry.deltaReserved)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCredits(entry.balanceAfter)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.actorType === 'admin' ? 'Administrator' : entry.actorType === 'system' ? 'System' : 'Workspace user'}</TableCell>
                      <TableCell className="max-w-56 text-xs text-muted-foreground">{entry.reason ?? '—'}</TableCell>
                      {canWrite && (
                        <TableCell className="text-right">
                          {reversed.has(entry.id) ? (
                            <Badge variant="outline">Reversed</Badge>
                          ) : REVERSIBLE.has(entry.entryType) ? (
                            <Button size="sm" variant="ghost" aria-label={`Reverse the ${ENTRY_LABEL[entry.entryType]} of ${formatCredits(entry.deltaBalance)}`} onClick={() => openReverse(entry)}>
                              Reverse
                            </Button>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {ledger.hasNextPage && (
                <Button variant="outline" size="sm" disabled={ledger.isFetchingNextPage} onClick={() => void ledger.fetchNextPage()}>
                  {ledger.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage and cost</CardTitle>
          <CardDescription>One row per AI request: its tokens, the exact prices in force when it was made (never today’s), the provider’s cost, and the credits it comes to once a conversion is set.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {costs.isError ? (
            <ErrorState title="Couldn’t load the usage" description={apiErrorMessage(costs.error, 'The API refused the request.')} onRetry={() => void costs.refetch()} />
          ) : costs.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : costItems.length === 0 ? (
            <EmptyState icon={Coins} title="No AI usage yet" description="Nothing has been counted for this workspace." className="py-8" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead className="text-right">Tokens in / out / cached</TableHead>
                    <TableHead>Price snapshot (per 1M)</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costItems.map((cost) => (
                    <CostRow key={cost.id} cost={cost} />
                  ))}
                </TableBody>
              </Table>
              {costs.hasNextPage && (
                <Button variant="outline" size="sm" disabled={costs.isFetchingNextPage} onClick={() => void costs.fetchNextPage()}>
                  {costs.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reservations</CardTitle>
          <CardDescription>Credit held before an AI request and how each hold ended. A hold that is never settled expires and returns its credit.</CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.isError ? (
            <ErrorState title="Couldn’t load the reservations" description={apiErrorMessage(reservations.error, 'The API refused the request.')} onRetry={() => void reservations.refetch()} />
          ) : reservations.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (reservations.data ?? []).length === 0 ? (
            <EmptyState icon={Coins} title="No reservations" description="Credit is only held in enforce mode." className="py-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Held</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Shortfall</TableHead>
                  <TableHead>Ended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.data!.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="whitespace-nowrap text-xs">{formatWhen(reservation.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={reservation.status === 'held' ? 'warning' : reservation.status === 'expired' ? 'destructive' : 'secondary'}>{reservation.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCredits(reservation.estimatedCredits)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCredits(reservation.chargedCredits)}</TableCell>
                    <TableCell className="text-right tabular-nums">{reservation.shortfallCredits === '0.00000000' ? '—' : formatCredits(reservation.shortfallCredits)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{reservation.settledAt ? `${formatWhen(reservation.settledAt)}${reservation.releaseReason ? ` · ${reservation.releaseReason}` : ''}` : `expires ${formatWhen(reservation.expiresAt)}`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <GrantDialog
        open={granting}
        onOpenChange={setGranting}
        isPending={grant.isPending}
        error={grant.error}
        onSubmit={(input) =>
          grant.mutate(input, {
            onSuccess: (result) => {
              setGranting(false);
              succeeded(result.replay ? 'That grant was already made.' : `${formatCredits(input.amount)} credits were granted.`);
            },
          })
        }
      />

      <AdjustDialog
        open={adjusting !== null}
        onOpenChange={(open) => (open ? undefined : setAdjusting(null))}
        bucket={adjusting ? (wallet.buckets.find((bucket) => bucket.id === adjusting.id) ?? adjusting) : null}
        isPending={adjust.isPending}
        error={adjust.error}
        onSubmit={(input) =>
          adjust.mutate(input, {
            onSuccess: () => {
              setAdjusting(null);
              succeeded('The adjustment was recorded in the ledger.');
            },
          })
        }
      />

      {reversing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || reverse.isPending ? undefined : setReversing(null))}
          title="Reverse this entry?"
          description={`${ENTRY_LABEL[reversing.entryType] ?? reversing.entryType} of ${formatCredits(reversing.deltaBalance)} credits from ${formatWhen(reversing.createdAt)}. A new entry undoes it; the original stays in the ledger. It can only be reversed once, and only if the credit is there to give back.`}
          confirmLabel="Reverse entry"
          destructive
          isPending={reverse.isPending}
          onConfirm={runReverse}
        >
          <div className="space-y-1.5">
            <label htmlFor="reverse-reason" className="text-sm font-medium text-foreground">
              Reason
            </label>
            <Textarea id="reverse-reason" rows={2} value={reverseReason} maxLength={500} onChange={(event) => setReverseReason(event.target.value)} />
            {reverseProblem && (
              <p role="alert" className="text-xs text-destructive">
                {reverseProblem}
              </p>
            )}
            {reverse.error ? (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(reverse.error, 'The entry could not be reversed.')}
              </p>
            ) : null}
          </div>
        </ConfirmDialog>
      )}

      {pendingMode && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || setMode.isPending ? undefined : setPendingMode(null))}
          title={pendingMode === 'enforce' ? 'Enforce credits for this workspace?' : 'Change this workspace’s credit mode?'}
          description={
            pendingMode === FOLLOW_PLATFORM
              ? 'The workspace will follow the platform mode again.'
              : `${MODE_LABEL[pendingMode]}. ${MODE_EXPLANATION[pendingMode]}${pendingMode === 'enforce' ? ' Without enough credit its customers get no AI reply and are handed to a person.' : ''}`
          }
          confirmLabel={pendingMode === 'enforce' ? 'Enforce credits' : 'Change mode'}
          destructive={pendingMode === 'enforce'}
          isPending={setMode.isPending}
          onConfirm={() =>
            setMode.mutate(pendingMode === FOLLOW_PLATFORM ? null : pendingMode, {
              onSuccess: () => {
                setPendingMode(null);
                succeeded('The workspace’s credit mode was saved.');
              },
            })
          }
        >
          {setMode.error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(setMode.error, 'The mode could not be saved.')}
            </p>
          ) : null}
        </ConfirmDialog>
      )}

      {maintenance && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || expire.isPending || backfill.isPending ? undefined : setMaintenance(null))}
          title={maintenance === 'expire' ? 'Write off expired credit?' : 'Make missing cost snapshots?'}
          description={
            maintenance === 'expire'
              ? 'Credit past its expiry that is not held is written off in the ledger, and holds that were never settled are released. The system does this by itself when the workspace reserves credit.'
              : 'Makes a cost snapshot for AI usage that has none (up to 200). Backfilled snapshots are counted and never charged.'
          }
          confirmLabel={maintenance === 'expire' ? 'Run expiry' : 'Backfill'}
          isPending={expire.isPending || backfill.isPending}
          onConfirm={() =>
            maintenance === 'expire'
              ? expire.mutate(undefined, {
                  onSuccess: (result) => {
                    setMaintenance(null);
                    succeeded(`${formatCredits(result.expired)} credits expired in ${result.buckets} bucket(s); ${result.released} stale hold(s) released.`);
                  },
                })
              : backfill.mutate(undefined, {
                  onSuccess: (result) => {
                    setMaintenance(null);
                    succeeded(`${result.snapshots} cost snapshot(s) made.`);
                  },
                })
          }
        >
          {expire.error || backfill.error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(maintenance === 'expire' ? expire.error : backfill.error, 'The action failed.')}
            </p>
          ) : null}
        </ConfirmDialog>
      )}
    </div>
  );
}

function CostRow({ cost }: { cost: UsageCost }) {
  const priced = cost.pricing.inputPerMillion !== null;
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-xs">{formatWhen(cost.calculatedAt)}</TableCell>
      <TableCell>
        <div className="text-sm text-foreground">{cost.kind ?? 'request'}</div>
        <div className="font-mono text-xs text-muted-foreground">{cost.model}</div>
      </TableCell>
      <TableCell className="text-right text-xs tabular-nums">
        {cost.tokens.input ?? '—'} / {cost.tokens.output ?? '—'} / {cost.tokens.cached ?? '—'}
      </TableCell>
      <TableCell className="text-xs tabular-nums">
        {priced ? (
          <span title={`Price history ${cost.pricing.priceHistoryId ?? ''}`}>
            in {formatCredits(cost.pricing.inputPerMillion)} · out {formatCredits(cost.pricing.outputPerMillion)}
            {cost.pricing.cachedInputPerMillion !== null ? ` · cached ${formatCredits(cost.pricing.cachedInputPerMillion)}` : ''} {cost.pricing.currency}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right text-xs tabular-nums">{cost.cost === null ? '—' : `${cost.cost.replace(/0+$/, '').replace(/\.$/, '')} ${cost.pricing.currency ?? ''}`}</TableCell>
      <TableCell className="text-right tabular-nums">
        {cost.credits === null ? '—' : formatCredits(cost.credits)}
        {cost.creditsState === 'shadow' && <div className="text-xs text-muted-foreground">counted, not charged</div>}
        {cost.creditsState === 'charged' && <div className="text-xs text-muted-foreground">charged</div>}
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[cost.status]} title={cost.reason ? (COST_REASON[cost.reason] ?? cost.reason) : undefined}>
          {cost.status === 'no_usage' ? 'no usage' : cost.status}
        </Badge>
        {cost.reason && <div className="mt-1 max-w-48 text-xs text-muted-foreground">{COST_REASON[cost.reason] ?? cost.reason}</div>}
      </TableCell>
    </TableRow>
  );
}
