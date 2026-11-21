import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiRoutingApi } from './aiRoutingApi';
import type { RoutingOverview, UpdateRoutingInput } from './types';

export const aiRoutingKeys = { overview: ['ai-routing', 'overview'] as const, health: ['ai-routing', 'health'] as const };

export const useAiRouting = () => useQuery({ queryKey: aiRoutingKeys.overview, queryFn: aiRoutingApi.get, retry: false });
export const useAiRoutingHealth = () => useQuery({ queryKey: aiRoutingKeys.health, queryFn: aiRoutingApi.health, retry: false, refetchInterval: 30_000 });

/**
 * A save answers with the policy the server now holds. That answer goes into the cache at once, so the screen shows what was saved the
 * moment the draft is cleared and not the old value until the whole view has been read again. The view is still read again, which
 * brings the model details and the readiness flags.
 */
export function useUpdateRouting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRoutingInput) => aiRoutingApi.update(input),
    onSuccess: ({ policy }) => {
      queryClient.setQueryData<RoutingOverview>(aiRoutingKeys.overview, (current) =>
        current
          ? {
              ...current,
              policy,
              effective: { gatewayReady: current.gateway.configured && policy.slot1ModelId !== null, routingActive: current.gateway.configured && policy.enabled && policy.slot1ModelId !== null },
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: aiRoutingKeys.overview });
    },
  });
}

/** Reads which reasoning efforts each model accepts from OpenRouter; the view is read again afterwards, which brings them. */
export function useSyncEfforts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => aiRoutingApi.syncEfforts(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: aiRoutingKeys.overview }),
  });
}

export const useValidateRouting = () => useMutation({ mutationFn: () => aiRoutingApi.validate() });
