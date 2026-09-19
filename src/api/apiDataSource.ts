import { aiApi } from './aiApi';
import { billingApi } from './billingApi';
import { channelApi } from './channelApi';
import { entitlementApi } from './entitlementApi';
import { featureApi } from './featureApi';
import { invoiceApi } from './invoiceApi';
import { organizationApi } from './organizationApi';
import { paymentApi } from './paymentApi';
import { planApi } from './planApi';
import { subscriptionApi } from './subscriptionApi';
import { usageApi } from './usageApi';
import { userApi } from './userApi';
import type { AdminDataSource } from './adminDataSource';

/**
 * Composes the per-domain API modules into the `AdminDataSource` the UI consumes.
 *
 * Selected only when `VITE_ADMIN_DATA_SOURCE=api`. Every endpoint behind it is still unbuilt on ormitech-api,
 * so requests will fail until it exists — deliberately, rather than falling back to mock data and making the
 * Admin look connected when it isn't.
 *
 * INTEGRATION REQUIREMENT — what ormitech-api must add before this source can be switched on.
 * The existing API is deliberately tenant-scoped: `TenantContext` comes from the caller's own access token and
 * the schema-level tenant plugin refuses any query without a concrete organizationId. A cross-tenant control
 * plane therefore cannot reuse the customer-facing endpoints; it needs its own, authorized by admin role:
 *
 *   GET/PATCH  /admin/organizations           list every tenant, change status  (organizations.read/write)
 *   GET        /admin/organizations/:id       one tenant with its overrides
 *   GET/POST/PATCH /admin/organizations/:id/users
 *   PATCH      /admin/organizations/:id/plan          assign a plan
 *   PUT        /admin/organizations/:id/entitlements  feature/channel/limit overrides
 *   GET/PUT    /admin/organizations/:id/ai            AI configuration per tenant
 *   GET        /admin/organizations/:id/usage
 *   GET/POST/PATCH /admin/plans               plan catalogue
 *   GET        /admin/features, /admin/limits, /admin/channels   catalogues
 *   GET        /admin/usage                   platform-wide usage rows
 *   GET/PATCH  /admin/subscriptions, /admin/payments, /admin/invoices
 *   GET        /admin/billing/summary, /admin/billing/charts
 *   POST       /admin/auth/login|refresh|logout        separate admin identity
 *
 * Nothing in the Admin fabricates these; until they exist the mock source stays the default.
 */
export const apiDataSource: AdminDataSource = {
  id: 'api',

  listFeatures: () => featureApi.list(),
  listChannels: () => channelApi.list(),
  listLimits: () => featureApi.listLimits(),

  listPlans: () => planApi.list(),
  getPlan: (id) => planApi.get(id),
  createPlan: (input) => planApi.create(input),
  updatePlan: (id, input) => planApi.update(id, input),

  listOrganizations: (params) => organizationApi.list(params),
  getOrganization: (id) => organizationApi.get(id),
  createOrganization: (input) => organizationApi.create(input),
  updateOrganization: (id, input) => organizationApi.update(id, input),
  setOrganizationStatus: (id, status) => organizationApi.setStatus(id, status),
  assignPlan: (id, planId) => entitlementApi.assignPlan(id, planId),
  updateOverrides: (id, overrides) => entitlementApi.updateOverrides(id, overrides),
  updateAiConfiguration: async (id, configuration) => {
    await aiApi.update(id, configuration);
    return organizationApi.get(id);
  },
  getUsage: (id) => entitlementApi.getUsage(id),

  listUsage: () => usageApi.list(),

  listSubscriptions: (params) => subscriptionApi.list(params),
  getSubscription: (id) => subscriptionApi.get(id),
  getSubscriptionByOrganization: (organizationId) => subscriptionApi.getByOrganization(organizationId),
  setSubscriptionStatus: (id, status) => subscriptionApi.setStatus(id, status),

  listPayments: (params) => paymentApi.list(params),

  listInvoices: (params) => invoiceApi.list(params),
  voidInvoice: (id) => invoiceApi.void(id),

  getBillingSummary: () => billingApi.summary(),
  getBillingCharts: () => billingApi.charts(),

  listOrganizationUsers: (organizationId) => userApi.list(organizationId),
  createOrganizationUser: (organizationId, input) => userApi.create(organizationId, input),
  updateOrganizationUser: (organizationId, userId, input) => userApi.update(organizationId, userId, input),
  setOrganizationUserStatus: (organizationId, userId, status) => userApi.setStatus(organizationId, userId, status),
};
