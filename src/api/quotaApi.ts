import { axiosClient } from './axiosClient';
import type { Quota } from '@/types/quota';

/**
 * Quotas on ormitech-api. These endpoints do not exist yet.
 *
 * Today the Admin derives quotas itself (`lib/quotas.ts::buildQuotas`) from resolved entitlements plus usage,
 * which keeps quota display and usage display mathematically identical. This module is the seam for when the
 * backend becomes the authority — it will have to be, since only the server can *enforce* a quota.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const quotaApi = {
  listForOrganization: (organizationId: string) => unwrap<Quota[]>(axiosClient.get(`/admin/organizations/${organizationId}/quotas`)),
};
