import { axiosClient } from '@/api/axiosClient';
import type { AiGateway, AiModel, CreateModelInput, GatewayCheckResult, ModelVerificationResult, SetPricingInput, UpdateModelInput } from './types';

const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

/**
 * The AI gateway and its models, against `/admin/ai/...` on ormitech-api (super admins only).
 *
 * The API is the authority on everything here: what may be enabled, what a price may be. Nothing is cached outside TanStack Query.
 * The OpenRouter key is a server environment setting: it is never sent to or from this panel.
 */
export const aiCatalogApi = {
  gateway: () => unwrap<AiGateway>(axiosClient.get('/admin/ai/gateway')),
  checkGateway: () => unwrap<GatewayCheckResult>(axiosClient.post('/admin/ai/gateway/check')),

  listModels: () => unwrap<AiModel[]>(axiosClient.get('/admin/ai/models')),
  createModel: (input: CreateModelInput) => unwrap<AiModel>(axiosClient.post('/admin/ai/models', input)),
  updateModel: (id: string, input: UpdateModelInput) => unwrap<AiModel>(axiosClient.patch(`/admin/ai/models/${id}`, input)),
  setModelPricing: (id: string, input: SetPricingInput) => unwrap<AiModel>(axiosClient.put(`/admin/ai/models/${id}/pricing`, input)),
  verifyModel: (id: string) => unwrap<ModelVerificationResult>(axiosClient.post(`/admin/ai/models/${id}/verify`)),
  setModelEnabled: (id: string, enabled: boolean) => unwrap<AiModel>(axiosClient.patch(`/admin/ai/models/${id}/status`, { enabled })),
  deleteModel: (id: string) => unwrap<{ deleted: true }>(axiosClient.delete(`/admin/ai/models/${id}`)),
};
