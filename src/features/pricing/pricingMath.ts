import type { PricingBilling, PricingLimits, PricingPlan } from './types';

/**
 * How the website works out what a card shows. Kept the same as the site's `data/pricing.js`, so the preview here
 * is the price a visitor will see.
 */
export type Period = 'monthly' | 'annual';

export function activeDiscount(plan: Pick<PricingPlan, 'discount' | 'monthlyPrice'>, now = Date.now()) {
  const discount = plan.discount;
  if (!discount || !(discount.percent > 0) || plan.monthlyPrice === null || plan.monthlyPrice === 0) return null;
  return discount.endsAt && new Date(discount.endsAt).getTime() <= now ? null : discount;
}

export function getPlanPrice(plan: Pick<PricingPlan, 'discount' | 'monthlyPrice'>, period: Period, billing: PricingBilling) {
  if (plan.monthlyPrice === null) return null;
  const annual = period === 'annual' ? billing.annualDiscountPercent / 100 : 0;
  const discount = activeDiscount(plan);
  const base = plan.monthlyPrice * (1 - annual);
  const perMonth = discount ? base * (1 - discount.percent / 100) : base;
  return { perMonth, yearly: perMonth * 12, original: discount ? base : null };
}

export function formatMoney(amount: number, currencyId: string, billing: PricingBilling): string {
  const currency = billing.currencies.find((item) => item.id === currencyId) ?? billing.currencies[0];
  if (!currency) return `${billing.symbol}${amount}`;
  const converted = Math.round((amount * currency.rate) / currency.round) * currency.round;
  const text = Number.isInteger(converted) ? converted.toLocaleString('en-US') : converted.toFixed(2);
  return `${currency.symbol}${text}`;
}

const count = (value: number | null | undefined) => (value == null ? null : value.toLocaleString('en-US'));

/** "1,000 conversations / month · 3 team members", or the words for a plan with no fixed numbers. */
export function summaryFromLimits(limits: PricingLimits): string {
  const conversations = count(limits.conversations);
  const members = count(limits.teamMembers);
  if (conversations === null && members === null) return 'Usage and team size set around your needs';
  const parts: string[] = [];
  parts.push(conversations === null ? 'Custom conversations' : `${conversations} conversations / month`);
  if (members !== null) parts.push(`${members} team ${limits.teamMembers === 1 ? 'member' : 'members'}`);
  else parts.push('Custom team size');
  return parts.join(' · ');
}
