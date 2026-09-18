import { axiosClient } from './axiosClient';
import type { Plan, PlanInput } from '@/types/plan';

/** SaaS package definitions on ormitech-api. These endpoints do not exist yet — see `organizationApi`. */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const planApi = {
  list: () => unwrap<Plan[]>(axiosClient.get('/admin/plans')),
  get: (id: string) => unwrap<Plan>(axiosClient.get(`/admin/plans/${id}`)),
  create: (input: PlanInput) => unwrap<Plan>(axiosClient.post('/admin/plans', input)),
  update: (id: string, input: PlanInput) => unwrap<Plan>(axiosClient.patch(`/admin/plans/${id}`, input)),
};
