import { axiosClient } from './axiosClient';
import type { Organization } from '@/types/organization';
import type { EntitlementOverrides, UsageSnapshot } from '@/types/entitlements';

/**
 * Tenant entitlements: assigning a plan, and the organization-level overrides layered on top of it.
 *
 * The Admin sends the full override object rather than individual toggles, so the server always receives a
 * complete, consistent picture of what was intended. Endpoints do not exist yet.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const entitlementApi = {
  assignPlan: (organizationId: string, planId: string) =>
    unwrap<Organization>(axiosClient.patch(`/admin/organizations/${organizationId}/plan`, { planId })),

  updateOverrides: (organizationId: string, overrides: EntitlementOverrides) =>
    unwrap<Organization>(axiosClient.put(`/admin/organizations/${organizationId}/entitlements`, overrides)),

  getUsage: (organizationId: string) => unwrap<UsageSnapshot>(axiosClient.get(`/admin/organizations/${organizationId}/usage`)),
};
