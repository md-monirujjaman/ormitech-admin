import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiCatalogApi } from './aiCatalogApi';
import type { AiModel, AiProvider, CreateModelInput, CreateProviderInput, SetPricingInput, UpdateModelInput, UpdateProviderInput } from './types';

export const aiCatalogKeys = {
  providers: ['ai-catalog', 'providers'] as const,
  models: ['ai-catalog', 'models'] as const,
};

export const useAiProviders = (enabled = true) => useQuery({ queryKey: aiCatalogKeys.providers, queryFn: aiCatalogApi.listProviders, enabled, retry: false });
export const useAiModels = (enabled = true) => useQuery({ queryKey: aiCatalogKeys.models, queryFn: aiCatalogApi.listModels, enabled, retry: false });

/**
 * Every change answers with what the server now holds. That answer replaces the row in the cache, so the screen shows
 * what the API says and not what was typed. A change to a provider can change its models (a new address switches them
 * off), and a change to a model changes its provider's count, so the other list is refetched too.
 */
function useProviderMutation<TInput>(run: (input: TInput) => Promise<AiProvider>, options: { gcTime?: number } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    // A mutation that carried an API key must not stay in memory once nothing is looking at it.
    ...(options.gcTime === undefined ? {} : { gcTime: options.gcTime }),
    onSuccess: (provider) => {
      queryClient.setQueryData<AiProvider[]>(aiCatalogKeys.providers, (current) => current?.map((row) => (row.id === provider.id ? provider : row)));
      void queryClient.invalidateQueries({ queryKey: aiCatalogKeys.providers });
      void queryClient.invalidateQueries({ queryKey: aiCatalogKeys.models });
    },
  });
}

const modelOf = (result: AiModel | { model: AiModel }): AiModel => ('providerSlug' in result ? result : result.model);

function useModelMutation<TInput, TResult extends AiModel | { model: AiModel }>(run: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (result) => {
      const model = modelOf(result);
      queryClient.setQueryData<AiModel[]>(aiCatalogKeys.models, (current) => current?.map((row) => (row.id === model.id ? model : row)));
      void queryClient.invalidateQueries({ queryKey: aiCatalogKeys.models });
      void queryClient.invalidateQueries({ queryKey: aiCatalogKeys.providers });
    },
  });
}

export const useCreateProvider = () => useProviderMutation((input: CreateProviderInput) => aiCatalogApi.createProvider(input), { gcTime: 0 });
export const useUpdateProvider = () => useProviderMutation(({ id, input }: { id: string; input: UpdateProviderInput }) => aiCatalogApi.updateProvider(id, input));
export const useSetProviderEnabled = () => useProviderMutation(({ id, enabled }: { id: string; enabled: boolean }) => aiCatalogApi.setProviderEnabled(id, enabled));
export const useSetDefaultProvider = () => useProviderMutation((id: string) => aiCatalogApi.setDefaultProvider(id));
export const useSetProviderCredentials = () => useProviderMutation(({ id, apiKey }: { id: string; apiKey: string }) => aiCatalogApi.setProviderCredentials(id, apiKey), { gcTime: 0 });

export function useCheckProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiCatalogApi.checkProvider(id),
    onSuccess: ({ provider }) => {
      queryClient.setQueryData<AiProvider[]>(aiCatalogKeys.providers, (current) => current?.map((row) => (row.id === provider.id ? provider : row)));
    },
  });
}

export const useCreateModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateModelInput) => aiCatalogApi.createModel(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiCatalogKeys.models });
      void queryClient.invalidateQueries({ queryKey: aiCatalogKeys.providers });
    },
  });
};
export const useUpdateModel = () => useModelMutation(({ id, input }: { id: string; input: UpdateModelInput }) => aiCatalogApi.updateModel(id, input));
export const useSetModelPricing = () => useModelMutation(({ id, input }: { id: string; input: SetPricingInput }) => aiCatalogApi.setModelPricing(id, input));
export const useVerifyModel = () => useModelMutation((id: string) => aiCatalogApi.verifyModel(id));
export const useSetModelEnabled = () => useModelMutation(({ id, enabled }: { id: string; enabled: boolean }) => aiCatalogApi.setModelEnabled(id, enabled));
export const useSetDefaultModel = () => useModelMutation((id: string) => aiCatalogApi.setDefaultModel(id));
export const useSetPlanAccess = () => useModelMutation(({ id, planSlugs }: { id: string; planSlugs: string[] }) => aiCatalogApi.setPlanAccess(id, planSlugs));
