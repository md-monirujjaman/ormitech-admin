import { axiosClient } from '@/api/axiosClient';
import type { PricingConfig, UpdatePlanInput, UpdateSettingsInput } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/** The pricing page's content, against `/admin/pricing` on ormitech-api. Super admins and content admins only. */
export const pricingApi = {
  get: () => unwrap<PricingConfig>(axiosClient.get('/admin/pricing')),
  updatePlan: (slug: string, input: UpdatePlanInput) => unwrap<PricingConfig>(axiosClient.patch(`/admin/pricing/plans/${slug}`, input)),
  updateSettings: (input: UpdateSettingsInput) => unwrap<PricingConfig>(axiosClient.patch('/admin/pricing/settings', input)),
};
