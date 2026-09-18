import { axiosClient } from './axiosClient';
import type { AiConfiguration } from '@/types/ai';

/**
 * Per-organization AI configuration on ormitech-api.
 *
 * This is configuration only — no AI provider is called from the Admin, now or later; ormitech-api owns that.
 * Endpoints do not exist yet.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const aiApi = {
  get: (organizationId: string) => unwrap<AiConfiguration>(axiosClient.get(`/admin/organizations/${organizationId}/ai`)),
  update: (organizationId: string, configuration: AiConfiguration) =>
    unwrap<AiConfiguration>(axiosClient.put(`/admin/organizations/${organizationId}/ai`, configuration)),
};
