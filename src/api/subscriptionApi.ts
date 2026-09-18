import { axiosClient } from './axiosClient';
import type { Paginated } from '@/types/api';
import type { Subscription, SubscriptionListParams, SubscriptionStatus } from '@/types/billing';

/**
 * Subscription records on ormitech-api. These endpoints do not exist yet.
 *
 * Changing a subscription's plan goes through `entitlementApi.assignPlan`, not a separate call here — plan
 * assignment has one code path so entitlements and billing can't drift apart.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const subscriptionApi = {
  list: (params: SubscriptionListParams) => unwrap<Paginated<Subscription>>(axiosClient.get('/admin/subscriptions', { params })),

  get: (id: string) => unwrap<Subscription>(axiosClient.get(`/admin/subscriptions/${id}`)),

  getByOrganization: (organizationId: string) =>
    unwrap<Subscription>(axiosClient.get(`/admin/organizations/${organizationId}/subscription`)),

  setStatus: (id: string, status: SubscriptionStatus) =>
    unwrap<Subscription>(axiosClient.patch(`/admin/subscriptions/${id}/status`, { status })),
};
