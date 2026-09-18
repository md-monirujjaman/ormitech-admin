import { axiosClient } from './axiosClient';
import type { FeatureDefinition, LimitDefinition } from '@/types/catalog';

/**
 * The feature and limit catalogs. These are data, not constants compiled into the UI — a new feature or limit
 * added on ormitech-api appears in the Admin without a frontend change. Endpoints do not exist yet.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const featureApi = {
  list: () => unwrap<FeatureDefinition[]>(axiosClient.get('/admin/features')),
  listLimits: () => unwrap<LimitDefinition[]>(axiosClient.get('/admin/limits')),
};
