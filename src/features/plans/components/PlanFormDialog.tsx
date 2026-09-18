import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { LimitField } from '@/components/shared/LimitField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Catalog } from '@/features/catalog/hooks';
import { planSchema, type PlanFormValues } from '@/features/plans/schemas';
import type { LimitValue } from '@/types/entitlements';
import type { Plan, PlanInput } from '@/types/plan';

function emptyToggles(keys: string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function emptyLimits(keys: string[]): Record<string, LimitValue> {
  return Object.fromEntries(keys.map((key) => [key, { kind: 'disabled' as const }]));
}

/**
 * Create/edit a SaaS package. Every feature, channel and limit row is rendered from the catalogs, so this form
 * never needs to change when a new feature or channel is added on the API side.
 */
export function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  catalog,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan;
  catalog: Catalog;
  isPending: boolean;
  error?: unknown;
  onSubmit: (input: PlanInput) => void;
}) {
  const isEdit = Boolean(plan);
  const featureKeys = catalog.features.map((feature) => feature.key);
  const channelKeys = catalog.channels.map((channel) => channel.key);
  const limitKeys = catalog.limits.map((limit) => limit.key);

  const { register, handleSubmit, control, reset, formState } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      price: 0,
      currency: 'USD',
      billingInterval: 'monthly',
      status: 'draft',
      custom: false,
      features: emptyToggles(featureKeys),
      channels: emptyToggles(channelKeys),
      limits: emptyLimits(limitKeys),
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      plan
        ? {
            name: plan.name,
            slug: plan.slug,
            description: plan.description,
            price: plan.price,
            currency: plan.currency,
            billingInterval: plan.billingInterval,
            status: plan.status,
            custom: plan.custom,
            features: { ...emptyToggles(featureKeys), ...plan.features },
            channels: { ...emptyToggles(channelKeys), ...plan.channels },
            limits: { ...emptyLimits(limitKeys), ...plan.limits },
          }
        : {
            name: '',
            slug: '',
            description: '',
            price: 0,
            currency: 'USD',
            billingInterval: 'monthly',
            status: 'draft',
            custom: false,
            features: emptyToggles(featureKeys),
            channels: emptyToggles(channelKeys),
            limits: emptyLimits(limitKeys),
          },
    );
    // Catalog keys are stable for a given catalog; re-running on every array identity change would reset the form mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan, reset, catalog]);

  function submit(values: PlanFormValues) {
    onSubmit({ ...values, currency: values.currency.toUpperCase() } as PlanInput);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${plan?.name}` : 'Create plan'}</DialogTitle>
          <DialogDescription>
            Entitlements set here are the defaults every organization on this plan inherits. Individual organizations can still override them.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6 py-2" onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plan-name">Name</Label>
                <Input id="plan-name" {...register('name')} />
                {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-slug">Slug</Label>
                <Input id="plan-slug" placeholder="professional" {...register('slug')} />
                {formState.errors.slug && <p className="text-xs text-destructive">{formState.errors.slug.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-description">Description</Label>
              <Textarea id="plan-description" rows={2} {...register('description')} />
              {formState.errors.description && <p className="text-xs text-destructive">{formState.errors.description.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="plan-price">Price</Label>
                <Input id="plan-price" type="number" min={0} step="1" {...register('price', { valueAsNumber: true })} />
                {formState.errors.price && <p className="text-xs text-destructive">{formState.errors.price.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-currency">Currency</Label>
                <Input id="plan-currency" maxLength={3} {...register('currency')} />
                {formState.errors.currency && <p className="text-xs text-destructive">{formState.errors.currency.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-interval">Interval</Label>
                <Controller
                  control={control}
                  name="billingInterval"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="plan-interval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-status">Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="plan-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <Controller
              control={control}
              name="custom"
              render={({ field }) => (
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Custom plan</p>
                    <p className="text-xs text-muted-foreground">
                      Entitlements are expected to be tailored per organization — the Enterprise pattern.
                    </p>
                  </div>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Custom plan" />
                </div>
              )}
            />
          </div>

          <ToggleGroup
            title="Features"
            description="What organizations on this plan can use by default."
            items={catalog.features.map((feature) => ({ key: feature.key, name: feature.name, description: feature.description }))}
            control={control}
            name="features"
          />

          <ToggleGroup
            title="Channels"
            description="Channels included with this plan."
            items={catalog.channels.map((channel) => ({ key: channel.key, name: channel.name, description: channel.description }))}
            control={control}
            name="channels"
          />

          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Limits</p>
              <p className="text-xs text-muted-foreground">Disabled, limited and unlimited are distinct — unlimited means no cap is enforced.</p>
            </div>
            <Controller
              control={control}
              name="limits"
              render={({ field }) => (
                <div className="space-y-2">
                  {catalog.limits.map((limit) => (
                    <div key={limit.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{limit.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {limit.description} · per {limit.period === 'month' ? 'month' : 'account'}
                        </p>
                      </div>
                      <LimitField
                        value={field.value[limit.key] ?? { kind: 'disabled' }}
                        onChange={(next) => field.onChange({ ...field.value, [limit.key]: next })}
                      />
                    </div>
                  ))}
                </div>
              )}
            />
          </div>

          {Boolean(error) && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">Couldn&apos;t save this plan. Try again.</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save plan' : 'Create plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleGroup({
  title,
  description,
  items,
  control,
  name,
}: {
  title: string;
  description: string;
  items: { key: string; name: string; description: string }[];
  control: ReturnType<typeof useForm<PlanFormValues>>['control'];
  name: 'features' | 'channels';
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={field.value[item.key] ?? false}
                  onCheckedChange={(checked) => field.onChange({ ...field.value, [item.key]: checked })}
                  aria-label={item.name}
                />
              </div>
            ))}
          </div>
        )}
      />
    </div>
  );
}
