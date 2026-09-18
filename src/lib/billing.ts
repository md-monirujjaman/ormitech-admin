import type { Subscription, SubscriptionStatus } from '@/types/billing';

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    // An unknown or malformed currency code shouldn't blank out a billing table.
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/** A yearly subscription contributes a twelfth of its price to monthly recurring revenue. */
export function monthlyPrice(subscription: Pick<Subscription, 'price' | 'billingInterval'>): number {
  return subscription.billingInterval === 'yearly' ? subscription.price / 12 : subscription.price;
}

/**
 * MRR counts only subscriptions that are actually billing. Trials haven't converted, and paused, cancelled and
 * expired subscriptions aren't producing revenue. `PAST_DUE` is included: the contract still stands, the
 * payment is simply late — dropping it would make a collections problem look like churn.
 */
export function computeMrr(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((subscription) => subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE')
    .reduce((total, subscription) => total + monthlyPrice(subscription), 0);
}

/**
 * Which statuses a subscription may move to next. The Admin uses this to offer only valid actions; it is also
 * the shape an automated lifecycle (trial expiry, dunning, renewal) would follow on ormitech-api.
 */
export const SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIAL: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
  ACTIVE: ['PAST_DUE', 'PAUSED', 'CANCELLED'],
  PAST_DUE: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
  PAUSED: ['ACTIVE', 'CANCELLED'],
  CANCELLED: ['EXPIRED'],
  EXPIRED: [],
};

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return SUBSCRIPTION_TRANSITIONS[from].includes(to);
}

/** Whether the subscription currently entitles the organization to service. */
export function isBillable(status: SubscriptionStatus): boolean {
  return status === 'ACTIVE' || status === 'TRIAL' || status === 'PAST_DUE';
}

export function formatBillingDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
