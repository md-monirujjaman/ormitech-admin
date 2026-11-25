import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { formatCredits, formatCreditsOrNA, formatUsd, formatWhen, NOT_AVAILABLE, STATUS_LABEL, STATUS_ORDER, STATUS_TONE } from '../format';
import { useCreditDashboard } from '../hooks';
import type { DashboardBreakdown, Filters } from '../types';
import { Stat } from './shared';

const number = new Intl.NumberFormat();

function Breakdown({ title, rows, usdVerified }: { title: string; rows: DashboardBreakdown[]; usdVerified: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing in this period.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{title.replace('By ', '')}</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Verified cost (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.name ?? 'none'}>
                  <TableCell className="font-mono text-xs">{row.name ?? 'Not recorded'}</TableCell>
                  <TableCell className="text-right tabular-nums">{number.format(row.requests)}</TableCell>
                  <TableCell className="text-right tabular-nums">{number.format(row.pendingReconciliation)}</TableCell>
                  <TableCell className="text-right tabular-nums">{number.format(row.failed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{usdVerified ? formatUsd(row.verifiedUsd ?? '0') : NOT_AVAILABLE}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** Real aggregation over what the API holds. A figure the API could not give reads "Not available", never zero. */
export function DashboardTab({ filters }: { filters: Filters }) {
  const query = useCreditDashboard(filters);
  if (query.isError) return <LoadFailed error={query.error} what="the credit dashboard" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data) return <Skeleton className="h-96 w-full" />;
  const data = query.data;
  const verified = data.costUnit.verified;
  const unverifiedText = data.cost.unverified.length === 0 ? (data.requests.total === 0 ? NOT_AVAILABLE : 'None') : data.cost.unverified.map((row) => `${formatCredits(row.cost)} ${row.unit ?? 'unknown unit'} (${row.requests})`).join(' · ');

  return (
    <div className="space-y-6">
      <div role="status" className={`rounded-md border p-3 text-sm ${verified ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10'}`}>
        {verified && data.costUnit.unit === null
          ? 'Every request’s cost is the provider’s own USD figure, read from its answer: nothing is estimated or priced by hand.'
          : verified
          ? `Costs reported in ${data.costUnit.unit} are counted as USD at ${data.costUnit.usdFactor} USD per unit (recorded on the Settings tab). Costs in any other unit are shown separately.`
          : 'The provider’s cost unit has not been verified as USD, so no USD total can be shown (Not available). The costs the provider reported are listed below in their own unit, and are never added to a USD figure.'}
      </div>
      <p className="text-xs text-muted-foreground">
        {formatWhen(data.period.from)} to {formatWhen(data.period.to)}
      </p>

      <section aria-label="Credits" className="space-y-2">
        <h3 className="text-sm font-semibold">Credits</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Credits issued" value={formatCredits(data.wallet.issued)} hint="Grants, plan and purchased credit in the period" />
          <Stat label="Credits consumed" value={formatCredits(data.wallet.consumed)} hint={`${number.format(data.wallet.debits)} charge(s), less reversals`} />
          <Stat label="Outstanding balance" value={formatCredits(data.wallet.outstandingBalance)} hint="Credit in wallets now (expired credit excluded)" />
          <Stat label="Reserved now" value={formatCredits(data.wallet.reservedNow)} hint={`${number.format(data.wallet.reservedNowCount)} hold(s) open`} />
          <Stat label="Settled reservations" value={formatCredits(data.wallet.reservations.settledCredits)} hint="Charged from reservations in the period" />
          <Stat label="Released reservations" value={formatCredits(data.wallet.reservations.releasedCredits)} hint="Unused or expired holds given back" />
          <Stat label="Adjustments (net)" value={formatCredits(data.wallet.adjustmentsNet)} />
          <Stat label="Expired credit" value={formatCredits(data.wallet.expired)} />
        </div>
      </section>

      <section aria-label="AI cost" className="space-y-2">
        <h3 className="text-sm font-semibold">AI API cost</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Verified AI API cost (USD)" value={formatUsd(data.cost.verifiedUsd)} hint={verified ? `${number.format(data.cost.verifiedRequests ?? 0)} request(s)` : 'Needs the cost unit to be verified'} />
          <Stat label="Settled cost (USD)" value={formatUsd(data.cost.settledUsd)} hint="Verified cost of requests that were charged" />
          <Stat label="Pending / unverified cost" value={unverifiedText} hint="Reported in a unit not verified as USD" />
          <Stat label="Requests" value={number.format(data.requests.total)} hint={`${number.format(data.requests.turns)} turn(s)`} />
          <Stat label="Pending reconciliation" value={number.format(data.cost.pendingReconciliation)} hint="Cost unknown: nothing charged or estimated" />
          <Stat label="Failed requests" value={number.format(data.cost.failedRequests)} hint="No usable answer: cost unknown" />
          <Stat label="Unknown cost" value={number.format(data.cost.unknown)} hint="Recorded before cost capture existed" />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requests by status</CardTitle>
          <CardDescription>Each request is in exactly one status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead>Meaning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {STATUS_ORDER.map((status) => (
                <TableRow key={status}>
                  <TableCell>
                    <Badge variant={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{number.format(data.requests.byStatus[status])}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{data.statusDefinitions[status]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspaces</CardTitle>
          <CardDescription>Only workspaces with AI requests in the period{data.workspaces.truncated ? ' (the list is cut at the busiest 50: narrow the filters to see the rest)' : ''}.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.workspaces.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workspace had an AI request in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Turns</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Unknown</TableHead>
                  <TableHead className="text-right">Verified cost (USD)</TableHead>
                  <TableHead className="text-right">Unverified cost</TableHead>
                  <TableHead className="text-right">Credits used</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.workspaces.items.map((row) => (
                  <TableRow key={row.organizationId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{number.format(row.requests)}</TableCell>
                    <TableCell className="text-right tabular-nums">{number.format(row.turns)}</TableCell>
                    <TableCell className="text-right tabular-nums">{number.format(row.pendingReconciliation)}</TableCell>
                    <TableCell className="text-right tabular-nums">{number.format(row.failed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{number.format(row.unknownCost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{verified ? formatUsd(row.verifiedUsd ?? '0') : NOT_AVAILABLE}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.unverifiedCost === null ? '—' : formatCreditsOrNA(row.unverifiedCost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCredits(row.creditsConsumed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCredits(row.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown title="By AI feature" rows={data.byKind} usdVerified={verified} />
        <Breakdown title="By model" rows={data.byModel} usdVerified={verified} />
      </div>

      <p className="text-xs text-muted-foreground">
        {data.notes.walletFilters} {data.notes.outstandingIsNow}
      </p>
    </div>
  );
}
