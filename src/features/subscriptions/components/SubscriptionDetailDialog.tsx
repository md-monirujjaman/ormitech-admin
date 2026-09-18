import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/LoadingState';
import { SubscriptionStatusBadge } from '@/components/shared/StatusBadge';
import { useOrganization } from '@/features/organizations/hooks';
import { useOrganizationEntitlements } from '@/features/organizations/useEntitlements';
import { formatBillingDate, formatCurrency } from '@/lib/billing';
import { formatLimit } from '@/lib/entitlements';
import type { Subscription } from '@/types/billing';

/**
 * Full subscription record plus the entitlements it currently confers.
 *
 * Entitlements are read through the Phase 2 resolver rather than stored on the subscription, which is what
 * keeps `Organization → Subscription → Plan → Entitlements` a single chain with one source of truth.
 */
export function SubscriptionDetailDialog({
  subscription,
  onOpenChange,
}: {
  subscription: Subscription;
  onOpenChange: (open: boolean) => void;
}) {
  const organizationQuery = useOrganization(subscription.organizationId);
  const organization = organizationQuery.data ?? null;
  const { catalog, plan, resolved, isLoading } = useOrganizationEntitlements(organization);

  const billingRows = [
    { label: 'Organization', value: organization?.name ?? subscription.organizationId },
    { label: 'Subscription ID', value: <span className="font-mono text-xs">{subscription.id}</span> },
    { label: 'Plan', value: plan?.name ?? subscription.planId },
    { label: 'Price', value: subscription.price === 0 ? 'Custom pricing' : formatCurrency(subscription.price, subscription.currency) },
    { label: 'Currency', value: subscription.currency },
    { label: 'Billing interval', value: subscription.billingInterval === 'monthly' ? 'Monthly' : 'Yearly' },
    { label: 'Status', value: <SubscriptionStatusBadge status={subscription.status} /> },
    { label: 'Start date', value: formatBillingDate(subscription.startedAt) },
    { label: 'Renewal date', value: formatBillingDate(subscription.renewalAt) },
    { label: 'Trial end', value: formatBillingDate(subscription.trialEndsAt) },
    { label: 'Cancellation date', value: formatBillingDate(subscription.cancelledAt) },
  ];

  const limitKeys = ['ai_conversations', 'ai_messages', 'monthly_messages', 'leads', 'agents'] as const;
  const entitlementLimits = catalog.limits.filter((definition) => limitKeys.includes(definition.key as (typeof limitKeys)[number]));
  const enabledChannels = catalog.channels.filter((definition) => resolved.channels[definition.key]?.enabled);
  const enabledFeatures = catalog.features.filter((definition) => resolved.features[definition.key]?.enabled);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>Subscription</DialogTitle>
          <DialogDescription>{organization?.name ?? subscription.organizationId}</DialogDescription>
        </DialogHeader>

        {isLoading || organizationQuery.isLoading ? (
          <LoadingState label="Loading subscription…" />
        ) : (
          <div className="space-y-6 py-2">
            <dl className="divide-y divide-border">
              {billingRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                  <dt className="text-sm text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 truncate text-right text-sm text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Entitlements</p>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channels</p>
                {enabledChannels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No channels enabled.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {enabledChannels.map((definition) => (
                      <Badge key={definition.key} variant="secondary" className="font-normal">
                        {definition.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Features</p>
                {enabledFeatures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No features enabled.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {enabledFeatures.map((definition) => (
                      <Badge key={definition.key} variant="secondary" className="font-normal">
                        {definition.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limits</p>
                <dl className="space-y-1">
                  {entitlementLimits.map((definition) => (
                    <div key={definition.key} className="flex items-center justify-between gap-3">
                      <dt className="text-sm text-muted-foreground">{definition.name}</dt>
                      <dd className="text-sm font-medium text-foreground">
                        {formatLimit(resolved.limits[definition.key]?.limit ?? { kind: 'disabled' })}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
