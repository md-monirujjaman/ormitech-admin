import { axiosClient } from './axiosClient';

export { organizationApi } from './organizationApi';
export { userApi } from './userApi';
export { planApi } from './planApi';
export { featureApi } from './featureApi';
export { channelApi } from './channelApi';
export { aiApi } from './aiApi';
export { entitlementApi } from './entitlementApi';
export { subscriptionApi } from './subscriptionApi';
export { paymentApi } from './paymentApi';
export { invoiceApi } from './invoiceApi';
export { usageApi } from './usageApi';
export { quotaApi } from './quotaApi';
export { billingApi } from './billingApi';
export type { Paginated } from '@/types/api';

export interface HealthCheckResponse {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  latencyMs?: number;
  checkedAt: string;
}

/** Platform health. Like the other modules, this endpoint does not exist on ormitech-api yet. */
export const systemApi = {
  health: () => axiosClient.get<HealthCheckResponse[]>('/admin/system/health').then((res) => res.data),
};
