import { useState } from 'react';
import { Package, Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PlanStatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useCatalog } from '@/features/catalog/hooks';
import { PlanFormDialog } from '@/features/plans/components/PlanFormDialog';
import { useCreatePlan, usePlans, useUpdatePlan } from '@/features/plans/hooks';
import { usePermissions } from '@/hooks/usePermissions';
import { formatLimit } from '@/lib/entitlements';
import type { Plan } from '@/types/plan';

export default function PlansPage() {
  const { can } = usePermissions();
  const canWrite = can('plans.write');

  const plansQuery = usePlans();
  const { catalog } = useCatalog();
  const createPlan = useCreatePlan();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const updatePlan = useUpdatePlan(editing?.id ?? '');

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="The SaaS packages organizations can be assigned. Entitlements defined here are plan defaults."
        actions={
          canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden />
              New plan
            </Button>
          )
        }
      />

      {plansQuery.isError ? (
        <ErrorState title="Couldn't load plans" onRetry={() => plansQuery.refetch()} />
      ) : plansQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-full" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No plans yet"
          description="Create a plan to define what organizations get by default."
          action={canWrite ? <Button onClick={() => setCreateOpen(true)}>Create plan</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const enabledFeatures = catalog.features.filter((feature) => plan.features[feature.key]);
            const enabledChannels = catalog.channels.filter((channel) => plan.channels[channel.key]);
            const headlineLimits = catalog.limits.filter((limit) =>
              ['monthly_messages', 'ai_conversations', 'agents', 'connected_channels'].includes(limit.key),
            );

            return (
              <Card key={plan.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-foreground">{plan.name}</CardTitle>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <PlanStatusBadge status={plan.status} />
                      {plan.custom && <Badge variant="outline">Custom</Badge>}
                    </div>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tracking-tight text-foreground">
                      {plan.price === 0 ? 'Custom' : `${plan.currency} ${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && <span className="text-sm text-muted-foreground">/ {plan.billingInterval === 'monthly' ? 'mo' : 'yr'}</span>}
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Channels ({enabledChannels.length}/{catalog.channels.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {enabledChannels.length === 0 ? (
                        <span className="text-sm text-muted-foreground">None</span>
                      ) : (
                        enabledChannels.map((channel) => (
                          <Badge key={channel.key} variant="secondary" className="font-normal">
                            {channel.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Features ({enabledFeatures.length}/{catalog.features.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {enabledFeatures.slice(0, 5).map((feature) => (
                        <Badge key={feature.key} variant="secondary" className="font-normal">
                          {feature.name}
                        </Badge>
                      ))}
                      {enabledFeatures.length > 5 && (
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                          +{enabledFeatures.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <dl className="space-y-1 border-t border-border pt-3">
                    {headlineLimits.map((limit) => (
                      <div key={limit.key} className="flex items-center justify-between gap-3">
                        <dt className="text-xs text-muted-foreground">{limit.name}</dt>
                        <dd className="text-xs font-medium text-foreground">{formatLimit(plan.limits[limit.key] ?? { kind: 'disabled' })}</dd>
                      </div>
                    ))}
                  </dl>

                  {canWrite && (
                    <Button variant="outline" size="sm" className="mt-auto w-full" onClick={() => setEditing(plan)}>
                      <Pencil className="size-3.5" aria-hidden />
                      Edit plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PlanFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        catalog={catalog}
        isPending={createPlan.isPending}
        error={createPlan.error}
        onSubmit={(input) => createPlan.mutate(input, { onSuccess: () => setCreateOpen(false) })}
      />

      {editing && (
        <PlanFormDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          plan={editing}
          catalog={catalog}
          isPending={updatePlan.isPending}
          error={updatePlan.error}
          onSubmit={(input) => updatePlan.mutate(input, { onSuccess: () => setEditing(null) })}
        />
      )}
    </div>
  );
}
