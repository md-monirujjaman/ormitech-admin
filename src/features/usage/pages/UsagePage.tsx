import { useMemo, useState } from 'react';
import { AlertTriangle, Gauge } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { QuotaList } from '@/components/shared/QuotaList';
import { QuotaStatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePlatformUsage } from '@/features/billing/hooks';
import { useCatalog } from '@/features/catalog/hooks';
import { useOrganizations } from '@/features/organizations/hooks';
import { usePlans } from '@/features/plans/hooks';
import { formatLimit, resolveEntitlements } from '@/lib/entitlements';
import { buildLimitAlerts, buildQuotas } from '@/lib/quotas';
import type { LimitKey } from '@/types/entitlements';
import type { Quota } from '@/types/quota';

/** Columns the table shows inline; the drawer shows every quota. */
const COLUMN_KEYS: LimitKey[] = ['monthly_messages', 'ai_conversations', 'ai_messages', 'leads', 'orders', 'agents', 'connected_channels'];

export default function UsagePage() {
  const usageQuery = usePlatformUsage();
  const organizationsQuery = useOrganizations({ page: 1, pageSize: 200 });
  const plansQuery = usePlans();
  const { catalog, isLoading: catalogLoading } = useCatalog();

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const organizations = organizationsQuery.data?.items ?? [];
    const plans = plansQuery.data ?? [];

    return (usageQuery.data ?? []).map((usageRow) => {
      const organization = organizations.find((candidate) => candidate.id === usageRow.organizationId);
      const plan = plans.find((candidate) => candidate.id === usageRow.planId);
      const resolved = resolveEntitlements(plan, organization?.overrides ?? { features: {}, channels: {}, limits: {} }, catalog);
      const quotas = buildQuotas(catalog.limits, resolved, usageRow.usage);

      return {
        organizationId: usageRow.organizationId,
        organizationName: usageRow.organizationName,
        planName: plan?.name ?? '—',
        quotas,
        alerts: buildLimitAlerts(usageRow.organizationId, usageRow.organizationName, quotas),
      };
    });
  }, [usageQuery.data, organizationsQuery.data, plansQuery.data, catalog]);

  const filtered = query.trim()
    ? rows.filter((row) => row.organizationName.toLowerCase().includes(query.trim().toLowerCase()))
    : rows;

  const criticalAlerts = rows
    .flatMap((row) => row.alerts)
    .filter((alert) => alert.status === 'critical' || alert.status === 'exceeded')
    .sort((a, b) => b.percentage - a.percentage);

  const selected = rows.find((row) => row.organizationId === selectedId) ?? null;

  if (usageQuery.isError || organizationsQuery.isError || plansQuery.isError) {
    return <ErrorState title="Couldn't load usage" onRetry={() => void usageQuery.refetch()} />;
  }

  if (usageQuery.isLoading || organizationsQuery.isLoading || plansQuery.isLoading || catalogLoading) {
    return <LoadingState label="Loading usage…" />;
  }

  const quotaFor = (quotas: Quota[], key: LimitKey) => quotas.find((quota) => quota.resource === key);

  return (
    <div className="space-y-6">
      <PageHeader title="Usage" description="What every tenant has consumed against its quotas this period." />

      {criticalAlerts.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <AlertTriangle className="size-4 text-destructive" aria-hidden />
              {criticalAlerts.length} quota{criticalAlerts.length === 1 ? '' : 's'} at 90% or above
            </CardTitle>
            <CardDescription>
              These tenants are close to, or past, a limit. Notification delivery is backend work — the Admin surfaces the state, it doesn&apos;t
              send anything.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {criticalAlerts.slice(0, 6).map((alert) => (
              <button
                key={`${alert.organizationId}-${alert.resource}`}
                type="button"
                onClick={() => setSelectedId(alert.organizationId)}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{alert.organizationName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {alert.label} · {alert.percentage}% of limit
                  </p>
                </div>
                <QuotaStatusBadge status={alert.status} />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="border-b border-border p-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search organization…"
            className="w-full sm:max-w-xs"
            aria-label="Search usage by organization"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState className="m-4 border-0" icon={Gauge} title="No organizations match this search" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                {COLUMN_KEYS.map((key) => (
                  <TableHead key={key}>{catalog.limits.find((limit) => limit.key === key)?.name ?? key}</TableHead>
                ))}
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.organizationId}>
                  <TableCell className="font-medium text-foreground">{row.organizationName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.planName}</TableCell>
                  {COLUMN_KEYS.map((key) => {
                    const quota = quotaFor(row.quotas, key);
                    return (
                      <TableCell key={key} className="whitespace-nowrap">
                        {!quota ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            <p className="text-sm text-foreground">
                              {quota.used.toLocaleString()} / {formatLimit(quota.limit)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {quota.unlimited
                                ? 'Unlimited'
                                : quota.disabled
                                  ? 'Not in plan'
                                  : `${quota.percentage ?? 0}% · ${quota.remaining?.toLocaleString() ?? 0} left`}
                            </p>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedId(row.organizationId)}>
                      View quotas
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="text-base text-popover-foreground">{selected?.organizationName ?? 'Quotas'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 p-4">
            {selected && (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {selected.planName}
                  </Badge>
                  {selected.alerts.length > 0 && (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      {selected.alerts.length} threshold{selected.alerts.length === 1 ? '' : 's'} crossed
                    </Badge>
                  )}
                </div>
                <QuotaList quotas={selected.quotas} />
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
