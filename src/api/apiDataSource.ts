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
