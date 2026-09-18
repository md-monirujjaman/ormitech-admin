import type { BillingInterval } from './plan';

/**
 * Billing records. The relation the whole module preserves:
 *
 *   Organization → Subscription → Plan → Entitlements → Usage / Limits
 *
 * A subscription is the *billing* record. It never carries its own copy of what a tenant may do — entitlements
 * still resolve from the plan plus organization overrides through `lib/entitlements.ts`, so plan logic lives in
 * exactly one place.
 */

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED'];

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  startedAt: string;
  renewalAt: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'];

/** How a payment was taken. No gateway is integrated — this only records what the backend reports. */
export type PaymentMethod = 'card' | 'bank_transfer' | 'mobile_wallet' | 'manual';

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  /**
   * The provider's public reference for the transaction (what support quotes back to a customer). Never a
   * gateway key, token or any other secret — those belong to ormitech-api and never reach the browser.
   */
  transactionReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';

export const INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE'];

export interface Invoice {
  id: string;
  organizationId: string;
  subscriptionId: string | null;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  createdAt: string;
}

export interface BillingSummary {
  monthlyRecurringRevenue: number;
  currency: string;
  activeSubscriptions: number;
  trialOrganizations: number;
  pastDue: number;
  cancelled: number;
  paymentsToday: number;
  revenueThisMonth: number;
  generatedAt: string;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
}

export interface SubscriptionGrowthPoint {
  month: string;
  subscriptions: number;
}

export interface PlanDistributionPoint {
  planId: string;
  planName: string;
  subscriptions: number;
}

export interface PaymentStatusPoint {
  status: PaymentStatus;
  count: number;
  amount: number;
}

export interface BillingCharts {
  revenue: RevenuePoint[];
  subscriptionGrowth: SubscriptionGrowthPoint[];
  planDistribution: PlanDistributionPoint[];
  paymentStatus: PaymentStatusPoint[];
}

export interface SubscriptionListParams {
  query?: string;
  status?: SubscriptionStatus | 'all';
  planId?: string | 'all';
  page?: number;
  pageSize?: number;
}

export interface PaymentListParams {
  query?: string;
  status?: PaymentStatus | 'all';
  organizationId?: string;
  page?: number;
  pageSize?: number;
}

export interface InvoiceListParams {
  query?: string;
  status?: InvoiceStatus | 'all';
  organizationId?: string;
  page?: number;
  pageSize?: number;
}
