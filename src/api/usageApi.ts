import { axiosClient } from './axiosClient';
import type { UsageSnapshot } from '@/types/entitlements';
import type { OrganizationUsageRow } from '@/types/quota';

/** Usage counters on ormitech-api. These endpoints do not exist yet. */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const usageApi = {
  /** Usage for one organization, for its current billing period. */
  get: (organizationId: string) => unwrap<UsageSnapshot>(axiosClient.get(`/admin/organizations/${organizationId}/usage`)),

  /** Platform-wide usage, one row per organization — so the Usage page needs one request, not one per tenant. */
  list: () => unwrap<OrganizationUsageRow[]>(axiosClient.get('/admin/usage')),
};
