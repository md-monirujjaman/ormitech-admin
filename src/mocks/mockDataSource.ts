import { INVOICE_SEED, PAYMENT_SEED, SUBSCRIPTION_SEED } from './billingSeed';
import { CHANNEL_CATALOG, FEATURE_CATALOG, LIMIT_CATALOG, ORGANIZATION_SEED, ORGANIZATION_USER_SEED, PLAN_SEED, USAGE_SEED } from './seed';
import type { AdminDataSource } from '@/api/adminDataSource';
import { computeMrr } from '@/lib/billing';
import type { Paginated } from '@/types/api';
import type {
  BillingCharts,
  BillingSummary,
  Invoice,
  Payment,
  PaymentStatus,
  PaymentStatusPoint,
  Subscription,
} from '@/types/billing';
import type { EntitlementOverrides, UsageSnapshot } from '@/types/entitlements';
import type { Organization, OrganizationListParams, OrganizationUser } from '@/types/organization';
import type { Plan } from '@/types/plan';
import type { OrganizationUsageRow } from '@/types/quota';

/**
 * In-memory implementation of `AdminDataSource` — the default while ormitech-api's admin endpoints don't exist.
 *
 * Writes mutate this module's arrays and survive until the page is reloaded, which is what makes the admin
 * flows (create, edit, suspend, assign plan, override entitlements) genuinely testable. It is not a fake
 * *server*: every screen backed by it is labeled as mock data in the UI, and nothing here is persisted or sent
 * anywhere.
 */

const LATENCY_MS = 180;
const delay = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
const clone = <T>(value: T): T => structuredClone(value);

/**
 * A couple of payments dated today, so the dashboard's "today" figures aren't permanently zero against static
 * fixtures. Still fixtures — no charge happened, and no gateway is involved.
 */
function todaysPayments(): Payment[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'pay_today_001',
      organizationId: 'org_harbor',
      invoiceId: null,
      amount: 199,
      currency: 'USD',
      status: 'PAID',
      method: 'card',
      transactionReference: 'TXN-TODAY-001',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'pay_today_002',
      organizationId: 'org_acme',
      invoiceId: null,
      amount: 79,
      currency: 'USD',
      status: 'PENDING',
      method: 'bank_transfer',
      transactionReference: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

const store = {
  plans: clone(PLAN_SEED),
  organizations: clone(ORGANIZATION_SEED),
  users: clone(ORGANIZATION_USER_SEED),
  usage: clone(USAGE_SEED),
  subscriptions: clone(SUBSCRIPTION_SEED),
  payments: [...clone(PAYMENT_SEED), ...todaysPayments()],
  invoices: clone(INVOICE_SEED),
};

const organizationName = (id: string) => store.organizations.find((organization) => organization.id === id)?.name ?? 'Unknown organization';

function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

const monthOf = (iso: string) => iso.slice(0, 7);

function findOrganization(id: string): Organization {
  const organization = store.organizations.find((candidate) => candidate.id === id);
  if (!organization) throw new Error(`Organization ${id} not found`);
  return organization;
}

function findPlan(id: string): Plan | undefined {
  return store.plans.find((plan) => plan.id === id);
}

/** Whether an organization is entitled to a channel — the same plan-then-override rule `resolveEntitlements` applies. */
function hasChannel(organization: Organization, channel: string): boolean {
  const override = organization.overrides.channels[channel];
  if (override !== undefined) return override;
  return findPlan(organization.planId)?.channels[channel] ?? false;
}

function nextId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Mirrors a real list/detail endpoint returning headline usage inline, so the table needs no request per row. */
function withUsageSummary(organization: Organization): Organization {
  return { ...organization, usageSummary: { monthlyMessagesUsed: store.usage[organization.id]?.values.monthly_messages ?? 0 } };
}

export const mockDataSource: AdminDataSource = {
  id: 'mock',

  async listFeatures() {
    await delay();
    return clone(FEATURE_CATALOG);
  },

  async listChannels() {
    await delay();
    return clone(CHANNEL_CATALOG);
  },

  async listLimits() {
    await delay();
    return clone(LIMIT_CATALOG);
  },

  async listPlans() {
    await delay();
    return clone(store.plans);
  },

  async getPlan(id) {
    await delay();
    return clone(findPlan(id) ?? null);
  },

  async createPlan(input) {
    await delay();
    const plan: Plan = { ...input, id: nextId('plan'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    store.plans.push(plan);
    return clone(plan);
  },

  async updatePlan(id, input) {
    await delay();
    const index = store.plans.findIndex((plan) => plan.id === id);
    const existing = store.plans[index];
    if (index === -1 || !existing) throw new Error(`Plan ${id} not found`);
    const updated: Plan = { ...existing, ...input, id, updatedAt: new Date().toISOString() };
    store.plans[index] = updated;
    return clone(updated);
  },

  async listOrganizations(params: OrganizationListParams): Promise<Paginated<Organization>> {
    await delay();
    const { query, status, planId, channel, sort = 'createdAt', direction = 'desc', page = 1, pageSize = 10 } = params;

    let items = clone(store.organizations);

    if (query?.trim()) {
      const needle = query.trim().toLowerCase();
      items = items.filter(
        (organization) =>
          organization.name.toLowerCase().includes(needle) ||
          organization.ownerName.toLowerCase().includes(needle) ||
          organization.ownerEmail.toLowerCase().includes(needle),
      );
    }
    if (status && status !== 'all') items = items.filter((organization) => organization.status === status);
    if (planId && planId !== 'all') items = items.filter((organization) => organization.planId === planId);
    if (channel && channel !== 'all') items = items.filter((organization) => hasChannel(organization, channel));

    items.sort((a, b) => {
      const factor = direction === 'asc' ? 1 : -1;
      if (sort === 'name') return a.name.localeCompare(b.name) * factor;
      if (sort === 'userCount') return (a.userCount - b.userCount) * factor;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * factor;
    });

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize).map(withUsageSummary), total, page, pageSize };
  },

  async getOrganization(id) {
    await delay();
    const organization = store.organizations.find((candidate) => candidate.id === id);
    return organization ? withUsageSummary(clone(organization)) : null;
  },

  async createOrganization(input) {
    await delay();
    const organization: Organization = {
      ...input,
      id: nextId('org'),
      createdAt: new Date().toISOString(),
      lastActivityAt: null,
      userCount: 1,
      overrides: { features: {}, channels: {}, limits: {} },
      ai: {
        aiEnabled: false,
        aiBotEnabled: false,
        humanHandoverEnabled: false,
        conversationLimit: { kind: 'disabled' },
        messageLimit: { kind: 'disabled' },
        model: null,
        systemPrompt: '',
        knowledgeSources: [],
        updatedAt: new Date().toISOString(),
      },
      connections: {},
    };
    store.organizations.push(organization);
    store.usage[organization.id] = { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: {} };
    store.users.push({
      id: nextId('usr'),
      organizationId: organization.id,
      name: organization.ownerName,
      email: organization.ownerEmail,
      role: 'owner',
      status: 'active',
      lastActiveAt: null,
      createdAt: organization.createdAt,
    });
    return clone(organization);
  },

  async updateOrganization(id, input) {
    await delay();
    const organization = findOrganization(id);
    Object.assign(organization, input);
    return clone(organization);
  },

  async setOrganizationStatus(id, status) {
    await delay();
    const organization = findOrganization(id);
    organization.status = status;
    return clone(organization);
  },

  async assignPlan(id, planId) {
    await delay();
    const organization = findOrganization(id);
    const plan = findPlan(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    // Overrides deliberately survive a plan change — an explicitly granted entitlement isn't silently revoked.
    organization.planId = planId;

    // The subscription is the billing record for the same plan, so plan assignment updates both here rather
    // than being a second, separate code path that could drift.
    const subscription = store.subscriptions.find((candidate) => candidate.organizationId === id);
    if (subscription) {
      subscription.planId = planId;
      subscription.price = plan.price;
      subscription.currency = plan.currency;
      subscription.billingInterval = plan.billingInterval;
      subscription.updatedAt = new Date().toISOString();
    }

    return clone(organization);
  },

  async updateOverrides(id, overrides: EntitlementOverrides) {
    await delay();
    const organization = findOrganization(id);
    organization.overrides = clone(overrides);
    return clone(organization);
  },

  async updateAiConfiguration(id, configuration) {
    await delay();
    const organization = findOrganization(id);
    organization.ai = { ...clone(configuration), updatedAt: new Date().toISOString() };
    return clone(organization);
  },

  async getUsage(id): Promise<UsageSnapshot> {
    await delay();
    return clone(store.usage[id] ?? { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: {} });
  },

  async listOrganizationUsers(organizationId) {
    await delay();
    return clone(store.users.filter((user) => user.organizationId === organizationId));
  },

  async createOrganizationUser(organizationId, input) {
    await delay();
    const user: OrganizationUser = {
      ...input,
      id: nextId('usr'),
      organizationId,
      lastActiveAt: null,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    findOrganization(organizationId).userCount += 1;
    return clone(user);
  },

  async updateOrganizationUser(organizationId, userId, input) {
    await delay();
    const user = store.users.find((candidate) => candidate.id === userId && candidate.organizationId === organizationId);
    if (!user) throw new Error(`User ${userId} not found`);
    Object.assign(user, input);
    return clone(user);
  },

  async setOrganizationUserStatus(organizationId, userId, status) {
    await delay();
    const user = store.users.find((candidate) => candidate.id === userId && candidate.organizationId === organizationId);
    if (!user) throw new Error(`User ${userId} not found`);
    user.status = status;
    return clone(user);
  },

  async listUsage(): Promise<OrganizationUsageRow[]> {
    await delay();
    return store.organizations.map((organization) => ({
      organizationId: organization.id,
      organizationName: organization.name,
      planId: organization.planId,
      usage: clone(store.usage[organization.id] ?? { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: {} }),
    }));
  },

  async listSubscriptions(params) {
    await delay();
    const { query, status, planId, page = 1, pageSize = 10 } = params;
    let items = clone(store.subscriptions);

    if (query?.trim()) {
      const needle = query.trim().toLowerCase();
      items = items.filter((subscription) => organizationName(subscription.organizationId).toLowerCase().includes(needle));
    }
    if (status && status !== 'all') items = items.filter((subscription) => subscription.status === status);
    if (planId && planId !== 'all') items = items.filter((subscription) => subscription.planId === planId);

    items.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return paginate(items, page, pageSize);
  },

  async getSubscription(id) {
    await delay();
    const subscription = store.subscriptions.find((candidate) => candidate.id === id);
    return subscription ? clone(subscription) : null;
  },

  async getSubscriptionByOrganization(organizationId) {
    await delay();
    const subscription = store.subscriptions.find((candidate) => candidate.organizationId === organizationId);
    return subscription ? clone(subscription) : null;
  },

  async setSubscriptionStatus(id, status) {
    await delay();
    const subscription = store.subscriptions.find((candidate) => candidate.id === id);
    if (!subscription) throw new Error(`Subscription ${id} not found`);

    subscription.status = status;
    subscription.updatedAt = new Date().toISOString();
    if (status === 'CANCELLED') subscription.cancelledAt = new Date().toISOString();
    if (status === 'ACTIVE') subscription.cancelledAt = null;
    if (status === 'CANCELLED' || status === 'EXPIRED') subscription.renewalAt = null;

    return clone(subscription);
  },

  async listPayments(params) {
    await delay();
    const { query, status, organizationId, page = 1, pageSize = 10 } = params;
    let items = clone(store.payments);

    if (organizationId) items = items.filter((payment) => payment.organizationId === organizationId);
    if (status && status !== 'all') items = items.filter((payment) => payment.status === status);
    if (query?.trim()) {
      const needle = query.trim().toLowerCase();
      items = items.filter(
        (payment) =>
          payment.id.toLowerCase().includes(needle) ||
          (payment.transactionReference ?? '').toLowerCase().includes(needle) ||
          organizationName(payment.organizationId).toLowerCase().includes(needle),
      );
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return paginate(items, page, pageSize);
  },

  async listInvoices(params) {
    await delay();
    const { query, status, organizationId, page = 1, pageSize = 10 } = params;
    let items = clone(store.invoices);

    if (organizationId) items = items.filter((invoice) => invoice.organizationId === organizationId);
    if (status && status !== 'all') items = items.filter((invoice) => invoice.status === status);
    if (query?.trim()) {
      const needle = query.trim().toLowerCase();
      items = items.filter(
        (invoice) => invoice.number.toLowerCase().includes(needle) || organizationName(invoice.organizationId).toLowerCase().includes(needle),
      );
    }

    items.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    return paginate(items, page, pageSize);
  },

  async voidInvoice(id) {
    await delay();
    const invoice = store.invoices.find((candidate) => candidate.id === id);
    if (!invoice) throw new Error(`Invoice ${id} not found`);
    // A settled invoice can't be voided — it would have to be refunded/credited instead.
    if (invoice.status === 'PAID') throw new Error('A paid invoice cannot be voided');
    invoice.status = 'VOID';
    return clone(invoice);
  },

  async getBillingSummary(): Promise<BillingSummary> {
    await delay();
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().toISOString().slice(0, 7);

    const paymentsToday = store.payments.filter((payment) => payment.createdAt.slice(0, 10) === today).length;
    const revenueThisMonth = store.payments
      .filter((payment) => payment.status === 'PAID' && monthOf(payment.createdAt) === thisMonth)
      .reduce((total, payment) => total + payment.amount, 0);

    return {
      monthlyRecurringRevenue: Math.round(computeMrr(store.subscriptions)),
      currency: 'USD',
      activeSubscriptions: store.subscriptions.filter((subscription) => subscription.status === 'ACTIVE').length,
      trialOrganizations: store.subscriptions.filter((subscription) => subscription.status === 'TRIAL').length,
      pastDue: store.subscriptions.filter((subscription) => subscription.status === 'PAST_DUE').length,
      cancelled: store.subscriptions.filter((subscription) => subscription.status === 'CANCELLED').length,
      paymentsToday,
      revenueThisMonth,
      generatedAt: new Date().toISOString(),
    };
  },

  async getBillingCharts(): Promise<BillingCharts> {
    await delay();

    // Every series is derived from the same fixtures the tables show, so the charts can't tell a different story.
    const months = [...new Set(store.invoices.map((invoice) => monthOf(invoice.issuedAt)))].sort();

    const revenue = months.map((month) => ({
      month,
      revenue: store.payments
        .filter((payment) => payment.status === 'PAID' && monthOf(payment.createdAt) === month)
        .reduce((total, payment) => total + payment.amount, 0),
    }));

    const subscriptionGrowth = months.map((month) => ({
      month,
      subscriptions: store.subscriptions.filter((subscription) => monthOf(subscription.startedAt) <= month).length,
    }));

    const planDistribution = store.plans.map((plan) => ({
      planId: plan.id,
      planName: plan.name,
      subscriptions: store.subscriptions.filter((subscription) => subscription.planId === plan.id).length,
    }));

    const statuses: PaymentStatus[] = ['PAID', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED'];
    const paymentStatus: PaymentStatusPoint[] = statuses.map((status) => {
      const matching = store.payments.filter((payment) => payment.status === status);
      return { status, count: matching.length, amount: matching.reduce((total, payment) => total + payment.amount, 0) };
    });

    return { revenue, subscriptionGrowth, planDistribution, paymentStatus };
  },
};

// Keeps the billing record types referenced here honest if the store shape ever changes.
export type MockBillingStore = { subscriptions: Subscription[]; payments: Payment[]; invoices: Invoice[] };
