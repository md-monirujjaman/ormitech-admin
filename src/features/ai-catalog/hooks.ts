import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiCatalogApi } from './aiCatalogApi';
import { aiRoutingKeys } from './routingHooks';
import type { AiModel, CreateModelInput, SetPricingInput, UpdateModelInput } from './types';

export const aiCatalogKeys = {
  gateway: ['ai-catalog', 'gateway'] as const,
  models: ['ai-catalog', 'models'] as const,
};

export const useAiGateway = () => useQuery({ queryKey: aiCatalogKeys.gateway, queryFn: aiCatalogApi.gateway, retry: false });
export const useAiModels = (enabled = true) => useQuery({ queryKey: aiCatalogKeys.models, queryFn: aiCatalogApi.listModels, enabled, retry: false });

/** Asks OpenRouter whether the key in the server environment is accepted. Nothing is stored; the answer is a short status. */
export function useCheckGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => aiCatalogApi.checkGateway(),
    onSuccess: ({ gateway }) => queryClient.setQueryData(aiCatalogKeys.gateway, gateway),
  });
}

const modelOf = (result: AiModel | { model: AiModel }): AiModel => ('providerSlug' in result ? result : result.model);

/**
 * Every change answers with what the server now holds. That answer replaces the row in the cache, so the screen shows what the API
 * says and not what was typed. The routing view lists models too, so it is refetched.
 */
function useModelMutation<TInput, TResult extends AiModel | { model: AiModel }>(run: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (result) => {
      const model = modelOf(result);
      queryClient.setQueryData<AiModel[]>(aiCatalogKeys.models, (current) => current?.map((row) => (row.id === model.id ? model : row)));
      void queryClient.invalidateQueries({ queryKey: aiCatalogKeys.models });
      void queryClient.invalidateQueries({ queryKey: aiRoutingKeys.overview });
    },
  });
}

export const useCreateModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateModelInput) => aiCatalogApi.createModel(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: aiCatalogKeys.models }),
  });
};
export const useUpdateModel = () => useModelMutation(({ id, input }: { id: string; input: UpdateModelInput }) => aiCatalogApi.updateModel(id, input));
export const useSetModelPricing = () => useModelMutation(({ id, input }: { id: string; input: SetPricingInput }) => aiCatalogApi.setModelPricing(id, input));
export const useVerifyModel = () => useModelMutation((id: string) => aiCatalogApi.verifyModel(id));
export const useSetModelEnabled = () => useModelMutation(({ id, enabled }: { id: string; enabled: boolean }) => aiCatalogApi.setModelEnabled(id, enabled));

export function useDeleteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiCatalogApi.deleteModel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiCatalogKeys.models });
      void queryClient.invalidateQueries({ queryKey: aiRoutingKeys.overview });
    },
  });
}
