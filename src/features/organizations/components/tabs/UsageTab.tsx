import { RotateCcw } from 'lucide-react';
import { LimitField } from '@/components/shared/LimitField';
import { UsageBar } from '@/components/shared/UsageBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/LoadingState';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Catalog } from '@/features/catalog/hooks';
import { computeUsageMetric, formatLimit } from '@/lib/entitlements';
import type { LimitKey, LimitValue, ResolvedEntitlements, UsageSnapshot } from '@/types/entitlements';

/** Usage against resolved limits, plus the per-organization limit overrides that produce those limits. */
export function UsageTab({
  usage,
  isLoading,
  resolved,
  catalog,
  canWrite,
  isPending,
  onLimitChange,
  onLimitReset,
}: {
  usage: UsageSnapshot | undefined;
  isLoading: boolean;
  resolved: ResolvedEntitlements;
  catalog: Catalog;
  canWrite: boolean;
  isPending: boolean;
  onLimitChange: (key: LimitKey, value: LimitValue) => void;
  onLimitReset: (key: LimitKey) => void;
}) {
  if (isLoading) return <LoadingState label="Loading usage…" />;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Usage this period</CardTitle>
          <CardDescription>{usage ? `${usage.periodStart} → ${usage.periodEnd}` : 'No usage recorded for this organization yet.'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {catalog.limits.map((definition) => (
            <UsageBar
              key={definition.key}
              metric={computeUsageMetric(
                definition.key,
                definition.name,
                usage?.values[definition.key] ?? 0,
                resolved.limits[definition.key]?.limit ?? { kind: 'disabled' },
              )}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limits</CardTitle>
          <CardDescription>
            Override any limit for this organization. Disabled, limited and unlimited are distinct states — unlimited means no cap is enforced,
            not a very large number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {catalog.limits.map((definition) => {
            const state = resolved.limits[definition.key] ?? { limit: { kind: 'disabled' as const }, source: 'plan' as const, planValue: { kind: 'disabled' as const } };
            const overridden = state.source === 'override';

            return (
              <div key={definition.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{definition.name}</p>
                    {overridden && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="font-normal text-primary">
                            Override
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Plan default: {formatLimit(state.planValue)}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {definition.description} · per {definition.period === 'month' ? 'month' : 'account'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {overridden && canWrite && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() => onLimitReset(definition.key)}
                          aria-label={`Reset ${definition.name} to plan default`}
                        >
                          <RotateCcw className="size-3.5" aria-hidden />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reset to plan default</TooltipContent>
                    </Tooltip>
                  )}
                  <LimitField
                    value={state.limit}
                    disabled={!canWrite || isPending}
                    onChange={(next) => onLimitChange(definition.key, next)}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
