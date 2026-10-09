import { axiosClient } from './axiosClient';
import { organizationApi } from './organizationApi';
import type { Organization } from '@/types/organization';
import type { EntitlementOverrides, UsageSnapshot } from '@/types/entitlements';

/**
 * Tenant entitlements: assigning a plan, and the organization-level overrides layered on top of it.
 *
 * The Admin sends the full override object rather than individual toggles, so the server always receives a
 * complete, consistent picture of what was intended. Endpoints do not exist yet.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/**
 * Both mutations answer with what they changed — the organization's plan, or the stored override set — and
 * then the organization is read back, because that is the whole record the caller is typed to receive and
 * only one endpoint assembles it. `updateAiConfiguration` in `apiDataSource` does the same thing for the same
 * reason.
 */
export const entitlementApi = {
  assignPlan: async (organizationId: string, planId: string): Promise<Organization> => {
    await unwrap<{ id: string; plan: string }>(
      axiosClient.patch(`/admin/organizations/${organizationId}/plan`, { planId }),
    );
    return organizationApi.get(organizationId);
  },

  updateOverrides: async (organizationId: string, overrides: EntitlementOverrides): Promise<Organization> => {
    await unwrap<EntitlementOverrides>(
      axiosClient.put(`/admin/organizations/${organizationId}/entitlements`, overrides),
    );
    return organizationApi.get(organizationId);
  },

  getUsage: (organizationId: string) => unwrap<UsageSnapshot>(axiosClient.get(`/admin/organizations/${organizationId}/usage`)),
};
