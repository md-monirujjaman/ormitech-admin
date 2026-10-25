import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pricingApi } from './pricingApi';
import type { UpdatePlanInput, UpdateSettingsInput } from './types';

const KEY = ['pricing'] as const;

export function usePricing() {
  return useQuery({ queryKey: KEY, queryFn: pricingApi.get });
}

/** Both saves answer with the whole current config, so the screen is replaced with it rather than patched. */
function useSaving<TInput>(save: (input: TInput) => ReturnType<typeof pricingApi.get>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: save, onSuccess: (config) => queryClient.setQueryData(KEY, config) });
}

export const useUpdatePlan = () => useSaving(({ slug, input }: { slug: string; input: UpdatePlanInput }) => pricingApi.updatePlan(slug, input));
export const useUpdateSettings = () => useSaving((input: UpdateSettingsInput) => pricingApi.updateSettings(input));
