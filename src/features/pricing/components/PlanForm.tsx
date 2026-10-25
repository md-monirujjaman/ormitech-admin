import { ArrowDown, ArrowUp, Plus, Trash2, Wand2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { suggestedSummary, type PlanDraft } from './draft';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Every field of one plan card, in the order a card reads: who it is, the price, the button, the numbers, the points, the offer. */
export function PlanForm({
  draft,
  onChange,
  symbol,
  disabled,
}: {
  draft: PlanDraft;
  onChange: (next: PlanDraft) => void;
  /** The base currency symbol the price is written in. */
  symbol: string;
  disabled: boolean;
}) {
  const set = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) => onChange({ ...draft, [key]: value });
  const setFeature = (index: number, value: string) => set('features', draft.features.map((feature, at) => (at === index ? value : feature)));
  const moveFeature = (index: number, direction: -1 | 1) => {
    const next = [...draft.features];
    const target = index + direction;
    const a = next[index];
    const b = next[target];
    if (a === undefined || b === undefined) return;
    next[index] = b;
    next[target] = a;
    set('features', next);
  };
  const percent = Number(draft.discountPercent);

  return (
    <div className="space-y-7">
      <Section title="The card">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plan name" htmlFor="plan-name">
            <Input id="plan-name" value={draft.name} maxLength={60} disabled={disabled} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Most popular" hint="Shows the “Most popular” ribbon. Only one plan can have it; choosing it here removes it from another.">
            <div className="flex h-9 items-center gap-2">
              <Switch checked={draft.popular} disabled={disabled} onCheckedChange={(value) => set('popular', value)} aria-label="Most popular" />
              <span className="text-sm text-muted-foreground">{draft.popular ? 'Highlighted' : 'Normal'}</span>
            </div>
          </Field>
          <Field label="Tagline (the line under the name)" htmlFor="plan-tagline" className="sm:col-span-2">
            <Input id="plan-tagline" value={draft.tagline} maxLength={160} disabled={disabled} onChange={(e) => set('tagline', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Price">
        <div className="inline-flex rounded-md border border-border p-0.5" role="radiogroup" aria-label="Price type">
          {(['fixed', 'custom'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={draft.priceMode === mode}
              disabled={disabled}
              onClick={() => set('priceMode', mode)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${draft.priceMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {mode === 'fixed' ? 'Fixed monthly price' : 'Custom (talk to sales)'}
            </button>
          ))}
        </div>
        {draft.priceMode === 'fixed' ? (
          <Field label={`Price per month (${symbol})`} htmlFor="plan-price" hint="Write 0 for a free plan. Other currencies and the yearly discount are worked out from this.">
            <Input id="plan-price" type="number" min={0} step="0.01" inputMode="decimal" value={draft.monthlyPrice} disabled={disabled} className="max-w-48" onChange={(e) => set('monthlyPrice', e.target.value)} />
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What the price shows" htmlFor="plan-label" hint="For example “Custom”.">
              <Input id="plan-label" value={draft.priceLabel} maxLength={40} disabled={disabled} onChange={(e) => set('priceLabel', e.target.value)} />
            </Field>
            <Field label="Line under it" htmlFor="plan-note">
              <Input id="plan-note" value={draft.priceNote} maxLength={120} disabled={disabled} onChange={(e) => set('priceNote', e.target.value)} />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Button">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button text" htmlFor="plan-cta">
            <Input id="plan-cta" value={draft.ctaLabel} maxLength={40} disabled={disabled} onChange={(e) => set('ctaLabel', e.target.value)} />
          </Field>
          <Field label="Where it goes" htmlFor="plan-href" hint="A full address, or a page on the website such as /contact.">
            <Input id="plan-href" value={draft.ctaHref} maxLength={300} disabled={disabled} onChange={(e) => set('ctaHref', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Limits" hint="Leave a box empty for “custom”: no fixed number. These also fill the comparison table and the plan finder.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Conversations / month" htmlFor="limit-conversations">
            <Input id="limit-conversations" type="number" min={0} placeholder="Custom" value={draft.conversations} disabled={disabled} onChange={(e) => set('conversations', e.target.value)} />
          </Field>
          <Field label="Team members" htmlFor="limit-members">
            <Input id="limit-members" type="number" min={0} placeholder="Custom" value={draft.teamMembers} disabled={disabled} onChange={(e) => set('teamMembers', e.target.value)} />
          </Field>
          <Field label="Social channels" htmlFor="limit-channels">
            <Input id="limit-channels" type="number" min={0} placeholder="Custom" value={draft.socialChannels} disabled={disabled} onChange={(e) => set('socialChannels', e.target.value)} />
          </Field>
        </div>
        <Field label="Summary line (above the points)" htmlFor="plan-summary">
          <div className="flex gap-2">
            <Input id="plan-summary" value={draft.summary} maxLength={160} disabled={disabled} onChange={(e) => set('summary', e.target.value)} />
            <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={disabled} onClick={() => set('summary', suggestedSummary(draft))}>
              <Wand2 className="size-4" aria-hidden />
              From limits
            </Button>
          </div>
        </Field>
      </Section>

      <Section title="What the plan includes">
        <Field label="Intro line (optional)" htmlFor="plan-intro" hint="For example “Everything in Free, plus:”.">
          <Input id="plan-intro" value={draft.featuresIntro} maxLength={80} disabled={disabled} onChange={(e) => set('featuresIntro', e.target.value)} />
        </Field>
        <ul className="space-y-2">
          {draft.features.map((feature, index) => (
            <li key={index} className="flex items-center gap-1.5">
              <Input value={feature} maxLength={120} disabled={disabled} aria-label={`Point ${index + 1}`} onChange={(e) => setFeature(index, e.target.value)} />
              <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Move up" disabled={disabled || index === 0} onClick={() => moveFeature(index, -1)}>
                <ArrowUp className="size-4" aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Move down" disabled={disabled || index === draft.features.length - 1} onClick={() => moveFeature(index, 1)}>
                <ArrowDown className="size-4" aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-destructive" aria-label="Remove point" disabled={disabled} onClick={() => set('features', draft.features.filter((_, at) => at !== index))}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" size="sm" disabled={disabled || draft.features.length >= 16} onClick={() => set('features', [...draft.features, ''])}>
          <Plus className="size-4" aria-hidden />
          Add a point
        </Button>
        <p className="text-xs text-muted-foreground">Up to 16 points. The card grows to fit, and the other cards in the row grow with it so they stay the same height.</p>
      </Section>

      <Section title="Discount" hint="Shows the old price struck through with a badge. It turns itself off after the end date.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Percent off" htmlFor="discount-percent" hint="0 = no discount.">
            <Input id="discount-percent" type="number" min={0} max={90} step="1" value={draft.discountPercent} disabled={disabled} onChange={(e) => set('discountPercent', e.target.value)} />
          </Field>
          <Field label="Badge text" htmlFor="discount-label" hint="Empty shows “Save X%”.">
            <Input id="discount-label" value={draft.discountLabel} maxLength={40} placeholder="Launch offer" disabled={disabled} onChange={(e) => set('discountLabel', e.target.value)} />
          </Field>
          <Field label="Last day (optional)" htmlFor="discount-ends" hint="Empty = no end date.">
            <Input id="discount-ends" type="date" value={draft.discountEndsAt} disabled={disabled} onChange={(e) => set('discountEndsAt', e.target.value)} />
          </Field>
        </div>
        {draft.priceMode === 'custom' && percent > 0 && <p className="text-xs text-amber-600 dark:text-amber-400">A custom-priced plan has no price to discount, so this will not show.</p>}
      </Section>
    </div>
  );
}
