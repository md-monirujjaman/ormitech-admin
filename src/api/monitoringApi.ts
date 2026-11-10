import { axiosClient } from './axiosClient';
import type { MonitoringSnapshot } from '@/types/monitoring';

/**
 * Redis, queue and outbox status.
 *
 * `super_admin` only, which the API enforces; the UI permission `system.read` decides only whether the page is shown. A request
 * without the role comes back 403 and the page says so. This always calls the real endpoint: there is no mock source for it.
 */
export const monitoringApi = {
  snapshot: () => axiosClient.get<{ data: MonitoringSnapshot }>('/admin/monitoring').then((response) => response.data.data),
};
