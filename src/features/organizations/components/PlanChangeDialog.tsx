import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Catalog } from '@/features/catalog/hooks';
import { formatCurrency } from '@/lib/billing';
import { diffEntitlements, resolveEntitlements } from '@/lib/entitlements';
import { cn } from '@/lib/utils';

const formatPlanPrice = (plan: Plan | undefined) => {
  if (!plan) return '—';
  if (plan.price === 0) return 'Custom pricing';
  return `${formatCurrency(plan.price, plan.currency)} / ${plan.billingInterval === 'monthly' ? 'mo' : 'yr'}`;
};
import type { EntitlementDiffEntry } from '@/types/entitlements';
import type { Organization } from '@/types/organization';
import type { Plan } from '@/types/plan';

/**
 * Plan assignment with a mandatory preview. The admin picks the target plan, sees every feature, channel and
 * limit that would change — losses called out separately — and only then confirms. Access is never removed
 * without being shown first.
 */
export function PlanChangeDialog({
  open,
  onOpenChange,
  organization,
  currentPlan,
  plans,
  catalog,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization;
  currentPlan: Plan | undefined;
  plans: Plan[];
  catalog: Catalog;
  isPending: boolean;
  onConfirm: (planId: string) => void;
}) {
  const [targetPlanId, setTargetPlanId] = useState(organization.planId);

  useEffect(() => {
    if (open) setTargetPlanId(organization.planId);
  }, [open, organization.planId]);

  const targetPlan = plans.find((plan) => plan.id === targetPlanId);

  const diff = useMemo(() => {
    const current = resolveEntitlements(currentPlan, organization.overrides, catalog);
    const next = resolveEntitlements(targetPlan, organization.overrides, catalog);
    return diffEntitlements(current, next, catalog);
  }, [currentPlan, targetPlan, organization.overrides, catalog]);

  const unchanged = targetPlanId === organization.planId;
  const priceChanged =
    Boolean(currentPlan && targetPlan) &&
    (currentPlan!.price !== targetPlan!.price || currentPlan!.billingInterval !== targetPlan!.billingInterval);
  const priceIncreased = (targetPlan?.price ?? 0) >= (currentPlan?.price ?? 0);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change plan"
      description={`Review what changes for ${organization.name} before applying the new plan.`}
      confirmLabel="Apply plan change"
      destructive={diff.losses.length > 0}
      isPending={isPending}
      onConfirm={() => onConfirm(targetPlanId)}
    >
      <div className="space-y-4">
        <div className="space-y-2 rounded-lg border border-border px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Current plan</p>
              <p className="font-medium text-foreground">{currentPlan?.name ?? 'None'}</p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">New plan</p>
              <p className="font-medium text-foreground">{targetPlan?.name ?? 'None'}</p>
            </div>
          </div>

          {priceChanged && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">Price</span>
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground line-through">{formatPlanPrice(currentPlan)}</span>
                <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
                <span className={cn('font-medium', priceIncreased ? 'text-foreground' : 'text-success')}>{formatPlanPrice(targetPlan)}</span>
              </span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="target-plan">Assign plan</Label>
          <Select value={targetPlanId} onValueChange={setTargetPlanId}>
            <SelectTrigger id="target-plan">
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.custom ? ' · custom' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {unchanged ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            This is the organization&apos;s current plan. Pick a different plan to see what would change.
          </p>
        ) : !diff.hasChanges ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No entitlement changes — this organization&apos;s overrides already cover every difference between the two plans.
          </p>
        ) : (
          <div className="space-y-4">
            {diff.losses.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <TrendingDown className="size-4" aria-hidden />
                  {diff.losses.length} entitlement{diff.losses.length === 1 ? '' : 's'} would be reduced or removed
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Anything listed below as a loss stops being available to this organization as soon as the change is applied.
                </p>
              </div>
            )}

            <DiffSection title="Features" entries={diff.features} />
            <DiffSection title="Channels" entries={diff.channels} />
            <DiffSection title="Limits" entries={diff.limits} />
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
}

function DiffSection({ title, entries }: { title: string; entries: EntitlementDiffEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li key={entry.key} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-foreground">{entry.label}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs">
              <span className="text-muted-foreground line-through">{entry.before}</span>
              <ArrowRight className="size-3 text-muted-foreground" aria-hidden />
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-medium',
                  entry.direction === 'loss' ? 'text-destructive' : entry.direction === 'gain' ? 'text-success' : 'text-foreground',
                )}
              >
                {entry.direction === 'gain' && <TrendingUp className="size-3" aria-hidden />}
                {entry.direction === 'loss' && <TrendingDown className="size-3" aria-hidden />}
                {entry.after}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
