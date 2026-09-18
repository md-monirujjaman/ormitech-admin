import { ORGANIZATION_SEED, PLAN_SEED } from './seed';
import type { Invoice, InvoiceStatus, Payment, PaymentMethod, PaymentStatus, Subscription, SubscriptionStatus } from '@/types/billing';

/**
 * BILLING FIXTURES FOR THE MOCK DATA SOURCE — none of this is real.
 *
 * No payment gateway is involved and no transaction ever happened: these are hand-written records so the
 * subscription, payment, invoice and revenue screens are exercisable before ormitech-api has a billing API.
 * Every screen backed by them shows a "Mock data" badge.
 */

const plan = (id: string) => PLAN_SEED.find((candidate) => candidate.id === id);

/** Deterministic per-organization billing state, chosen to cover every subscription status. */
const SUBSCRIPTION_STATE: Record<string, { status: SubscriptionStatus; startedAt: string; trialEndsAt?: string; cancelledAt?: string }> = {
  org_acme: { status: 'ACTIVE', startedAt: '2026-02-14T00:00:00Z' },
  org_northwind: { status: 'ACTIVE', startedAt: '2026-03-02T00:00:00Z' },
  org_bright: { status: 'TRIAL', startedAt: '2026-08-29T00:00:00Z', trialEndsAt: '2026-09-28T00:00:00Z' },
  org_coastal: { status: 'ACTIVE', startedAt: '2026-04-11T00:00:00Z' },
  org_zenith: { status: 'PAST_DUE', startedAt: '2026-02-27T00:00:00Z' },
  org_orbit: { status: 'TRIAL', startedAt: '2026-09-15T00:00:00Z', trialEndsAt: '2026-10-15T00:00:00Z' },
  org_vertex: { status: 'ACTIVE', startedAt: '2025-11-19T00:00:00Z' },
  org_lumen: { status: 'CANCELLED', startedAt: '2026-01-23T00:00:00Z', cancelledAt: '2026-07-04T00:00:00Z' },
  org_harbor: { status: 'ACTIVE', startedAt: '2026-05-08T00:00:00Z' },
  org_pioneer: { status: 'TRIAL', startedAt: '2026-09-04T00:00:00Z', trialEndsAt: '2026-10-04T00:00:00Z' },
  org_nova: { status: 'PAUSED', startedAt: '2026-06-17T00:00:00Z' },
  org_summit: { status: 'EXPIRED', startedAt: '2025-09-30T00:00:00Z' },
};

function addMonths(iso: string, months: number): string {
  const date = new Date(iso);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

export const SUBSCRIPTION_SEED: Subscription[] = ORGANIZATION_SEED.map((organization) => {
  const state = SUBSCRIPTION_STATE[organization.id] ?? { status: 'ACTIVE' as SubscriptionStatus, startedAt: organization.createdAt };
  const organizationPlan = plan(organization.planId);
  const interval = organizationPlan?.billingInterval ?? 'monthly';
  const renews = state.status !== 'CANCELLED' && state.status !== 'EXPIRED';

  return {
    id: `sub_${organization.id.replace('org_', '')}`,
    organizationId: organization.id,
    planId: organization.planId,
    status: state.status,
    price: organizationPlan?.price ?? 0,
    currency: organizationPlan?.currency ?? 'USD',
    billingInterval: interval,
    startedAt: state.startedAt,
    renewalAt: renews ? addMonths('2026-09-18T00:00:00Z', interval === 'yearly' ? 12 : 1) : null,
    trialEndsAt: state.trialEndsAt ?? null,
    cancelledAt: state.cancelledAt ?? null,
    createdAt: state.startedAt,
    updatedAt: '2026-09-18T00:00:00Z',
  } satisfies Subscription;
});

/** Months invoices are generated across, so the revenue chart has real shape derived from these records. */
const INVOICE_MONTHS = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

const INVOICE_STATUS_BY_OFFSET: Record<string, InvoiceStatus> = {
  // Current month is still open for everyone; history is paid unless the organization is in trouble.
  '2026-09': 'OPEN',
};

const PAYMENT_METHODS: PaymentMethod[] = ['card', 'bank_transfer', 'mobile_wallet', 'manual'];

const invoices: Invoice[] = [];
const payments: Payment[] = [];

SUBSCRIPTION_SEED.forEach((subscription, subscriptionIndex) => {
  // Trials and never-started tenants have nothing to invoice yet.
  if (subscription.status === 'TRIAL' || subscription.price === 0) return;

  const startMonth = subscription.startedAt.slice(0, 7);
  const months = INVOICE_MONTHS.filter((month) => month >= startMonth);

  months.forEach((month, monthIndex) => {
    const sequence = `${month.replace('-', '')}${String(subscriptionIndex + 1).padStart(3, '0')}`;
    const issuedAt = `${month}-01T00:00:00Z`;
    const dueAt = `${month}-15T00:00:00Z`;
    const isCurrentMonth = month === '2026-09';

    let status: InvoiceStatus = INVOICE_STATUS_BY_OFFSET[month] ?? 'PAID';
    if (subscription.status === 'PAST_DUE' && isCurrentMonth) status = 'OPEN';
    if (subscription.status === 'PAST_DUE' && month === '2026-08') status = 'UNCOLLECTIBLE';
    if (subscription.status === 'CANCELLED' && month > subscription.cancelledAt!.slice(0, 7)) return;
    if (subscription.status === 'EXPIRED' && isCurrentMonth) status = 'VOID';

    const invoiceId = `inv_${sequence}`;
    invoices.push({
      id: invoiceId,
      organizationId: subscription.organizationId,
      subscriptionId: subscription.id,
      number: `ORMI-${sequence}`,
      amount: subscription.price,
      currency: subscription.currency,
      status,
      issuedAt,
      dueAt,
      paidAt: status === 'PAID' ? `${month}-0${(monthIndex % 8) + 2}T10:15:00Z` : null,
      createdAt: issuedAt,
    });

    // A payment record only exists where a charge was attempted.
    if (status === 'PAID') {
      payments.push({
        id: `pay_${sequence}`,
        organizationId: subscription.organizationId,
        invoiceId,
        amount: subscription.price,
        currency: subscription.currency,
        status: 'PAID',
        method: PAYMENT_METHODS[(subscriptionIndex + monthIndex) % PAYMENT_METHODS.length] ?? 'card',
        transactionReference: `TXN-${sequence}`,
        createdAt: `${month}-0${(monthIndex % 8) + 2}T10:15:00Z`,
        updatedAt: `${month}-0${(monthIndex % 8) + 2}T10:15:00Z`,
      });
    } else if (status === 'UNCOLLECTIBLE' || (status === 'OPEN' && subscription.status === 'PAST_DUE')) {
      payments.push({
        id: `pay_${sequence}`,
        organizationId: subscription.organizationId,
        invoiceId,
        amount: subscription.price,
        currency: subscription.currency,
        status: 'FAILED',
        method: 'card',
        transactionReference: `TXN-${sequence}`,
        createdAt: `${month}-16T08:02:00Z`,
        updatedAt: `${month}-16T08:02:00Z`,
      });
    } else if (status === 'OPEN') {
      payments.push({
        id: `pay_${sequence}`,
        organizationId: subscription.organizationId,
        invoiceId,
        amount: subscription.price,
        currency: subscription.currency,
        status: 'PENDING',
        method: PAYMENT_METHODS[subscriptionIndex % PAYMENT_METHODS.length] ?? 'card',
        transactionReference: null,
        createdAt: `${month}-02T09:00:00Z`,
        updatedAt: `${month}-02T09:00:00Z`,
      });
    }
  });
});

// One refund and one cancelled charge, so those statuses are represented.
const refundable = payments.find((payment) => payment.status === 'PAID' && payment.organizationId === 'org_coastal');
if (refundable) {
  payments.push({
    ...refundable,
    id: `${refundable.id}_refund`,
    status: 'REFUNDED',
    amount: refundable.amount,
    transactionReference: `${refundable.transactionReference}-R`,
    createdAt: '2026-08-22T11:30:00Z',
    updatedAt: '2026-08-22T11:30:00Z',
  });
}

payments.push({
  id: 'pay_cancelled_001',
  organizationId: 'org_nova',
  invoiceId: null,
  amount: 19,
  currency: 'USD',
  status: 'CANCELLED',
  method: 'mobile_wallet',
  transactionReference: null,
  createdAt: '2026-09-10T14:20:00Z',
  updatedAt: '2026-09-10T14:20:00Z',
});

export const INVOICE_SEED: Invoice[] = invoices;
export const PAYMENT_SEED: Payment[] = payments;

export const PAYMENT_STATUS_ORDER: PaymentStatus[] = ['PAID', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED'];
