import { axiosClient } from '@/api/axiosClient';
import type {
  AiModel,
  AiProvider,
  CreateModelInput,
  CreateProviderInput,
  ModelVerificationResult,
  ProviderCheckResult,
  SetPricingInput,
  UpdateModelInput,
  UpdateProviderInput,
} from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/**
 * The AI provider and model catalogue, against `/admin/ai/...` on ormitech-api (super admins only).
 *
 * The API is the authority on everything here: what may be enabled, what a price may be, which plans exist. Nothing is
 * cached outside TanStack Query, and an API key only ever travels in the body of the request that sets it.
 */
export const aiCatalogApi = {
  listProviders: () => unwrap<AiProvider[]>(axiosClient.get('/admin/ai/providers')),
  createProvider: (input: CreateProviderInput) => unwrap<AiProvider>(axiosClient.post('/admin/ai/providers', input)),
  updateProvider: (id: string, input: UpdateProviderInput) => unwrap<AiProvider>(axiosClient.patch(`/admin/ai/providers/${id}`, input)),
  setProviderEnabled: (id: string, enabled: boolean) => unwrap<AiProvider>(axiosClient.patch(`/admin/ai/providers/${id}/status`, { enabled })),
  setDefaultProvider: (id: string) => unwrap<AiProvider>(axiosClient.post(`/admin/ai/providers/${id}/default`)),
  setProviderCredentials: (id: string, apiKey: string) => unwrap<AiProvider>(axiosClient.put(`/admin/ai/providers/${id}/credentials`, { apiKey })),
  checkProvider: (id: string) => unwrap<ProviderCheckResult>(axiosClient.post(`/admin/ai/providers/${id}/check`)),

  listModels: () => unwrap<AiModel[]>(axiosClient.get('/admin/ai/models')),
  createModel: (input: CreateModelInput) => unwrap<AiModel>(axiosClient.post('/admin/ai/models', input)),
  updateModel: (id: string, input: UpdateModelInput) => unwrap<AiModel>(axiosClient.patch(`/admin/ai/models/${id}`, input)),
  setModelPricing: (id: string, input: SetPricingInput) => unwrap<AiModel>(axiosClient.put(`/admin/ai/models/${id}/pricing`, input)),
  verifyModel: (id: string) => unwrap<ModelVerificationResult>(axiosClient.post(`/admin/ai/models/${id}/verify`)),
  setModelEnabled: (id: string, enabled: boolean) => unwrap<AiModel>(axiosClient.patch(`/admin/ai/models/${id}/status`, { enabled })),
  setDefaultModel: (id: string) => unwrap<AiModel>(axiosClient.post(`/admin/ai/models/${id}/default`)),
  setPlanAccess: (id: string, planSlugs: string[]) => unwrap<AiModel>(axiosClient.put(`/admin/ai/models/${id}/plan-access`, { planSlugs })),
};
