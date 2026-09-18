import { Repeat } from 'lucide-react';
import { PlanStatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Catalog } from '@/features/catalog/hooks';
import { formatLimit } from '@/lib/entitlements';
import type { ResolvedEntitlements } from '@/types/entitlements';
import type { Organization } from '@/types/organization';
import type { Plan } from '@/types/plan';

export function PlanTab({
  organization,
  plan,
  catalog,
  resolved,
  canWrite,
  onChangePlan,
}: {
  organization: Organization;
  plan: Plan | undefined;
  catalog: Catalog;
  resolved: ResolvedEntitlements;
  canWrite: boolean;
  onChangePlan: () => void;
}) {
  if (!plan) {
    return (
      <EmptyState
        title="No plan assigned"
        description="This organization has no plan, so it inherits no entitlements. Assign one to give it access."
        action={canWrite ? <Button onClick={onChangePlan}>Assign a plan</Button> : undefined}
      />
    );
  }

  const overrideCount =
    Object.keys(organization.overrides.features).length +
    Object.keys(organization.overrides.channels).length +
    Object.keys(organization.overrides.limits).length;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PlanStatusBadge status={plan.status} />
            {plan.custom && <Badge variant="outline">Custom</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {plan.price === 0 ? 'Custom pricing' : `${plan.currency} ${plan.price.toLocaleString()}`}
            </span>
            {plan.price > 0 && <span className="text-sm text-muted-foreground">/ {plan.billingInterval === 'monthly' ? 'month' : 'year'}</span>}
          </div>

          {canWrite && (
            <Button variant="outline" onClick={onChangePlan}>
              <Repeat className="size-4" aria-hidden />
              Change plan
            </Button>
          )}

          {overrideCount > 0 && (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              This organization has {overrideCount} entitlement override{overrideCount === 1 ? '' : 's'} on top of the plan. Overrides are kept
              when the plan changes — reset them on the Features, Channels or Usage tabs.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Effective limits</CardTitle>
          <CardDescription>Plan default, and what this organization actually gets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {catalog.limits.map((definition) => {
            const state = resolved.limits[definition.key];
            const overridden = state?.source === 'override';
            return (
              <div key={definition.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{definition.name}</p>
                  {overridden && (
                    <p className="text-xs text-muted-foreground">Plan default: {formatLimit(state.planValue)}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {overridden && (
                    <Badge variant="outline" className="font-normal text-primary">
                      Override
                    </Badge>
                  )}
                  <span className="text-sm font-medium text-foreground">{formatLimit(state?.limit ?? { kind: 'disabled' })}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
