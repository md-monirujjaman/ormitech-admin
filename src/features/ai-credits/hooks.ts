import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiCreditsApi } from './aiCreditsApi';
import type { AdjustInput, CreditMode, GrantInput, ReverseInput, UpdatePolicyInput } from './types';

export const creditKeys = {
  overview: (organizationId: string) => ['ai-credits', organizationId, 'overview'] as const,
  ledger: (organizationId: string) => ['ai-credits', organizationId, 'ledger'] as const,
  costs: (organizationId: string) => ['ai-credits', organizationId, 'costs'] as const,
  reservations: (organizationId: string) => ['ai-credits', organizationId, 'reservations'] as const,
  policy: ['ai-credits', 'policy'] as const,
  reconciliation: ['ai-credits', 'reconciliation'] as const,
};

export const useCreditsOverview = (organizationId: string) => useQuery({ queryKey: creditKeys.overview(organizationId), queryFn: () => aiCreditsApi.overview(organizationId), retry: false });
export const useReservations = (organizationId: string) => useQuery({ queryKey: creditKeys.reservations(organizationId), queryFn: () => aiCreditsApi.reservations(organizationId), retry: false });

export const useLedger = (organizationId: string) =>
  useInfiniteQuery({ queryKey: creditKeys.ledger(organizationId), queryFn: ({ pageParam }) => aiCreditsApi.ledger(organizationId, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (last) => last.nextCursor ?? undefined, retry: false });

export const useUsageCosts = (organizationId: string) =>
  useInfiniteQuery({ queryKey: creditKeys.costs(organizationId), queryFn: ({ pageParam }) => aiCreditsApi.usageCosts(organizationId, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (last) => last.nextCursor ?? undefined, retry: false });

export const useCreditPolicy = () => useQuery({ queryKey: creditKeys.policy, queryFn: aiCreditsApi.policy, retry: false });
export const useReconciliation = () => useQuery({ queryKey: creditKeys.reconciliation, queryFn: aiCreditsApi.reconciliation, retry: false });

/** Every change to a workspace's credits refetches what the screen shows from the server, so it shows what the API holds and not what was typed. */
function useWorkspaceMutation<TInput, TResult>(organizationId: string, run: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-credits', organizationId] }),
  });
}

export const useGrantCredits = (organizationId: string) => useWorkspaceMutation(organizationId, (input: GrantInput) => aiCreditsApi.grant(organizationId, input));
export const useAdjustCredits = (organizationId: string) => useWorkspaceMutation(organizationId, (input: AdjustInput) => aiCreditsApi.adjust(organizationId, input));
export const useReverseEntry = (organizationId: string) => useWorkspaceMutation(organizationId, (input: ReverseInput) => aiCreditsApi.reverse(organizationId, input));
export const useSetCreditMode = (organizationId: string) => useWorkspaceMutation(organizationId, (mode: CreditMode | null) => aiCreditsApi.setMode(organizationId, mode));
export const useExpireCredits = (organizationId: string) => useWorkspaceMutation(organizationId, () => aiCreditsApi.expire(organizationId));
export const useBackfillCosts = (organizationId: string) => useWorkspaceMutation(organizationId, () => aiCreditsApi.backfill(organizationId));

export function useUpdateCreditPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePolicyInput) => aiCreditsApi.updatePolicy(input),
    onSuccess: (policy) => {
      queryClient.setQueryData(creditKeys.policy, policy);
      // The mode of every workspace may have changed with the platform's.
      void queryClient.invalidateQueries({ queryKey: ['ai-credits'] });
    },
  });
}
