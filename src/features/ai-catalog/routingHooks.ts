import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiRoutingApi } from './aiRoutingApi';
import type { UpdateRoutingInput } from './types';

export const aiRoutingKeys = { overview: ['ai-routing', 'overview'] as const, health: ['ai-routing', 'health'] as const };

export const useAiRouting = () => useQuery({ queryKey: aiRoutingKeys.overview, queryFn: aiRoutingApi.get, retry: false });
export const useAiRoutingHealth = () => useQuery({ queryKey: aiRoutingKeys.health, queryFn: aiRoutingApi.health, retry: false, refetchInterval: 30_000 });

export function useUpdateRouting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRoutingInput) => aiRoutingApi.update(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: aiRoutingKeys.overview }),
  });
}

export const useValidateRouting = () => useMutation({ mutationFn: () => aiRoutingApi.validate() });
