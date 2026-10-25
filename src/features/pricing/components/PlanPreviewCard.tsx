import { ArrowRight, BarChart3, Building2, Check, Rocket, Send, Sparkles, Sprout, Star, type LucideIcon } from 'lucide-react';
import { formatMoney, getPlanPrice, type Period } from '../pricingMath';
import type { PricingBilling, PricingPlan } from '../types';

const ICONS: Record<string, LucideIcon> = { free: Send, starter: Rocket, growth: Sprout, accelerate: BarChart3, enterprise: Building2 };

const BRAND = '#F20D45';

function endsOn(endsAt: string | null | undefined): string | null {
  return endsAt ? new Date(endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
}

/**
 * A plan card drawn the way the website's pricing page draws it (same layout, colours and wording), so what is
 * edited here is what a visitor sees. It stays light in the dark admin theme on purpose: the website is light.
 */
export function PlanPreviewCard({
  plan,
  period,
  currency,
  billing,
  reserveOfferRow = false,
}: {
  plan: PricingPlan;
  period: Period;
  currency: string;
  billing: PricingBilling;
  /** Keeps an empty row where another card shows its offer, so the prices line up. */
  reserveOfferRow?: boolean;
}) {
  const price = getPlanPrice(plan, period, billing);
  const Icon = ICONS[plan.id] ?? Sparkles;
  const hasOffer = price !== null && price.original !== null && plan.discount !== null;
  const ends = hasOffer ? endsOn(plan.discount?.endsAt) : null;
  const billed =
    price === null
      ? plan.priceNote
      : plan.monthlyPrice === 0
        ? 'Free forever'
        : `${period === 'annual' ? `Billed yearly · ${formatMoney(price.yearly, currency, billing)} per year` : 'Billed monthly'}${ends ? ` · offer ends ${ends}` : ''}`;

  return (
    <div className={`relative h-full ${plan.popular ? 'pt-3' : ''}`}>
      {plan.popular && (
        <span
          className="absolute left-1/2 top-0 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1 text-[10.5px] font-bold uppercase tracking-[.1em] text-white"
          style={{ backgroundColor: BRAND }}
        >
          <Star aria-hidden className="size-3 fill-current" />
          Most popular
        </span>
      )}
      <article
        className="relative flex h-full min-h-[440px] flex-col overflow-hidden rounded-[18px] border bg-white p-5 text-[#0B0D12]"
        style={{ borderColor: plan.popular ? BRAND : 'rgba(226,232,240,.8)', boxShadow: plan.popular ? '0 20px 44px -26px rgba(242,13,69,.5)' : '0 1px 2px rgba(13,27,61,.04)' }}
      >
        <span aria-hidden className="flex size-11 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(242,13,69,.1)', color: BRAND }}>
          <Icon className="size-5" strokeWidth={2.3} />
        </span>
        <h3 className="mt-3.5 text-[21px] font-bold tracking-[-0.02em]">{plan.name || 'Plan name'}</h3>
        <p className="mt-1 min-h-[40px] text-[13px] leading-5 text-slate-500">{plan.tagline}</p>

        {hasOffer && plan.discount ? (
          <p className="mt-3.5 flex h-5 items-center gap-2 text-[12px]">
            <span className="rounded-full px-2 py-0.5 font-bold uppercase tracking-[.06em]" style={{ backgroundColor: 'rgba(242,13,69,.1)', color: BRAND }}>
              {plan.discount.label || `Save ${plan.discount.percent}%`}
            </span>
            <span className="tabular-nums text-slate-400 line-through">{formatMoney(price.original ?? 0, currency, billing)}</span>
          </p>
        ) : (
          reserveOfferRow && <div aria-hidden className="mt-3.5 h-5" />
        )}

        <div className={`flex min-h-[42px] items-end gap-1.5 ${hasOffer || reserveOfferRow ? 'mt-1.5' : 'mt-4'}`}>
          <span className="text-[38px] font-bold leading-none tracking-[-0.04em] tabular-nums">
            {price ? formatMoney(price.perMonth, currency, billing) : plan.priceLabel || 'Custom'}
          </span>
          {price && <span className="pb-0.5 text-[13px] text-slate-400">/month</span>}
        </div>
        <p className="mt-1.5 min-h-[18px] text-[12px] text-slate-500">{billed}</p>

        <span
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold"
          style={plan.popular ? { backgroundColor: BRAND, borderColor: BRAND, color: '#fff' } : { borderColor: plan.id === 'starter' ? 'rgba(242,13,69,.6)' : '#cbd5e1', color: plan.id === 'starter' ? BRAND : '#0B0D12' }}
        >
          {plan.cta.label || 'Button'}
          <ArrowRight aria-hidden className="size-3.5" />
        </span>

        <div className="mt-5 flex-1">
          <p className="text-[12px] font-medium text-slate-500">{plan.summary}</p>
          {plan.featuresIntro && <p className="mt-3 text-[12.5px] font-semibold">{plan.featuresIntro}</p>}
          <ul className={`space-y-2 ${plan.featuresIntro ? 'mt-2.5' : 'mt-3.5'}`}>
            {plan.features.map((feature, index) => (
              <li key={`${feature}-${index}`} className="flex items-start gap-2.5 text-[12.5px] leading-[18px] text-slate-600">
                <span aria-hidden className="mt-[2px] flex size-3.5 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: BRAND }}>
                  <Check className="size-2" strokeWidth={4} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}
