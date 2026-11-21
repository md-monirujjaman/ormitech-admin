import { axiosClient } from '@/api/axiosClient';
import type { RoutingOverview, RoutingPolicy, RoutingProblem, UpdateRoutingInput } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/** Multi-model routing against `/admin/ai/routing` on ormitech-api (super admins only). The API validates every change before saving it. */
export const aiRoutingApi = {
  get: () => unwrap<RoutingOverview>(axiosClient.get('/admin/ai/routing')),
  update: (input: UpdateRoutingInput) => unwrap<{ policy: RoutingPolicy; warnings: RoutingProblem[] }>(axiosClient.put('/admin/ai/routing', input)),
  validate: () => unwrap<{ ok: boolean; problems: RoutingProblem[] }>(axiosClient.post('/admin/ai/routing/validate')),
  syncEfforts: () => unwrap<{ synced: number; unknown: string[] }>(axiosClient.post('/admin/ai/routing/sync-efforts')),
  health: () => unwrap<{ breakers: Array<{ modelRowId: string; failures: number; open: boolean; openUntil: string | null }> }>(axiosClient.get('/admin/ai/routing/health')),
};
