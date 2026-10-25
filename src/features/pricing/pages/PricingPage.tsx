import { Settings2, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import { BillingSettingsDialog } from '../components/BillingSettingsDialog';
import { changesFrom, draftToPlan, toDraft, type PlanDraft } from '../components/draft';
import { PlanForm } from '../components/PlanForm';
import { PlanPreviewCard } from '../components/PlanPreviewCard';
import { usePricing, useUpdatePlan, useUpdateSettings } from '../hooks';
import { formatMoney, getPlanPrice, type Period } from '../pricingMath';
import type { PricingConfig, PricingPlan } from '../types';

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ id: T; label: string }>; onChange: (value: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-border bg-background p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={option.id === value}
          onClick={() => onChange(option.id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${option.id === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The pricing page of the website, edited here. Pick a plan, change its fields, and see the card as visitors will see
 * it. Saving puts it on the website within about a minute. Every change is recorded in the audit log.
 */
export default function PricingPage() {
  const { can } = usePermissions();
  const canWrite = can('pricing.write');
  const query = usePricing();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing"
        description="The plans and prices on the website's pricing page. Edit a card, check the preview, save."
        showMockNotice={false}
      />
      {query.isError ? (
        <ErrorState title="Couldn't load the pricing" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />
      ) : query.isLoading || !query.data ? (
        <Skeleton className="h-[40rem] w-full" />
      ) : query.data.plans.length === 0 ? (
        <EmptyState icon={Tag} title="No plans yet" description="The pricing tables have no plans. They are set up by a database migration." />
      ) : (
        <Editor config={query.data} canWrite={canWrite} />
      )}
    </div>
  );
}

function Editor({ config, canWrite }: { config: PricingConfig; canWrite: boolean }) {
  const { billing, plans } = config;
  const [slug, setSlug] = useState(plans[0]?.id ?? '');
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({});
  const [period, setPeriod] = useState<Period>('monthly');
  const [currency, setCurrency] = useState(billing.currencies[0]?.id ?? 'usd');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const updatePlan = useUpdatePlan();
  const updateSettings = useUpdateSettings();

  const selected = plans.find((plan) => plan.id === slug) ?? plans[0]!;
  const draftFor = (plan: PricingPlan): PlanDraft => drafts[plan.id] ?? toDraft(plan);
  const draft = draftFor(selected);
  const changes = changesFrom(selected, draft);
  const dirty = Object.keys(changes).length > 0;
  const anyDirty = plans.some((plan) => Object.keys(changesFrom(plan, draftFor(plan))).length > 0);

  // The cards as they will look: the saved plans, with the one being edited replaced by what is in the form.
  const preview = useMemo(() => plans.map((plan) => (drafts[plan.id] ? draftToPlan(drafts[plan.id]!, plan.id) : plan)), [plans, drafts]);
  const previewSelected = preview.find((plan) => plan.id === selected.id) ?? selected;
  const row = preview.filter((plan) => plan.id !== 'enterprise');
  const reserveOfferRow = row.some((plan) => getPlanPrice(plan, period, billing)?.original != null);
  const price = getPlanPrice(previewSelected, period, billing);

  const choose = (id: string) => {
    if (id === slug) return;
    setNotice(null);
    setSlug(id);
  };

  const save = async () => {
    if (!dirty) return;
    try {
      const saved = await updatePlan.mutateAsync({ slug: selected.id, input: changes });
      setDrafts((current) => {
        const { [selected.id]: _gone, ...rest } = current;
        void _gone;
        return rest;
      });
      void saved;
      setNotice('Saved. The website shows it within about a minute.');
    } catch {
      // The API's reason is shown under the form.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Plans">
          {plans.map((plan) => {
            const dirtyPlan = Object.keys(changesFrom(plan, draftFor(plan))).length > 0;
            const planPrice = getPlanPrice(plan, 'monthly', billing);
            return (
              <button
                key={plan.id}
                type="button"
                role="tab"
                aria-selected={plan.id === selected.id}
                onClick={() => choose(plan.id)}
                className={`rounded-lg border px-3.5 py-2 text-left transition-colors ${plan.id === selected.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/60'}`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {plan.name}
                  {plan.popular && <Badge variant="default" className="px-1.5 py-0 text-[10px]">Popular</Badge>}
                  {plan.discountActive && plan.discount && <Badge variant="success" className="px-1.5 py-0 text-[10px]">-{plan.discount.percent}%</Badge>}
                  {dirtyPlan && <span className="size-1.5 rounded-full bg-amber-500" title="Unsaved changes" />}
                </span>
                <span className="text-xs text-muted-foreground">{planPrice ? `${formatMoney(planPrice.perMonth, billing.currencies[0]?.id ?? 'usd', billing)} / month` : plan.priceLabel}</span>
              </button>
            );
          })}
        </div>
        {canWrite && (
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="size-4" aria-hidden />
            Billing settings
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <Card className="p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{selected.name}</h2>
              {dirty ? <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span> : notice && <span className="text-xs text-muted-foreground">{notice}</span>}
            </div>
            {canWrite && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!dirty || updatePlan.isPending}
                  onClick={() => {
                    setDrafts(({ [selected.id]: _gone, ...rest }) => {
                      void _gone;
                      return rest;
                    });
                    updatePlan.reset();
                  }}
                >
                  Discard
                </Button>
                <Button size="sm" disabled={!dirty || updatePlan.isPending || !draft.name.trim()} onClick={save}>
                  {updatePlan.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            )}
          </div>
          <PlanForm draft={draft} symbol={billing.currencies[0]?.symbol ?? billing.symbol} disabled={!canWrite} onChange={(next) => setDrafts({ ...drafts, [selected.id]: next })} />
          {updatePlan.error != null && (
            <p className="mt-5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{apiErrorMessage(updatePlan.error, 'The OrmiTech API refused the change.')}</p>
          )}
          {anyDirty && !dirty && <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">Another plan has unsaved changes. Open it to save or discard them.</p>}
        </Card>

        <div className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Live preview</h2>
            <div className="flex gap-2">
              <Segmented
                label="Currency"
                value={currency}
                onChange={setCurrency}
                options={billing.currencies.map((item) => ({ id: item.id, label: item.label }))}
              />
              <Segmented
                label="Billing period"
                value={period}
                onChange={setPeriod}
                options={[
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'annual', label: 'Annual' },
                ]}
              />
            </div>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <PlanPreviewCard plan={previewSelected} period={period} currency={currency} billing={billing} />
          </div>
          {price?.original != null && (
            <p className="text-xs text-muted-foreground">
              Visitors see {formatMoney(price.perMonth, currency, billing)} instead of {formatMoney(price.original, currency, billing)}.
            </p>
          )}
          {period === 'annual' && billing.annualDiscountPercent > 0 && <p className="text-xs text-muted-foreground">Annual billing takes {billing.annualDiscountPercent}% off (Billing settings).</p>}
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">All cards together</h2>
          <p className="text-xs text-muted-foreground">How the row looks on the website. Cards in a row are always the same height, so a long list on one card makes them all taller.</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-4">
          <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {row.map((plan) => (
              <div key={plan.id} className={plan.id === selected.id ? 'rounded-[20px] ring-2 ring-primary/60 ring-offset-2 ring-offset-transparent' : ''}>
                <PlanPreviewCard plan={plan} period={period} currency={currency} billing={billing} reserveOfferRow={reserveOfferRow} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <BillingSettingsDialog
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) updateSettings.reset();
        }}
        billing={billing}
        isPending={updateSettings.isPending}
        error={updateSettings.error}
        onSubmit={async (input) => {
          try {
            await updateSettings.mutateAsync(input);
            setSettingsOpen(false);
            setNotice('Billing settings saved.');
          } catch {
            // Shown in the dialog.
          }
        }}
      />
    </div>
  );
}
