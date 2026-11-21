import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creditSystemApi } from './creditSystemApi';
import type { CostUnitInput, CreditMode, Filters, FinancialInput, LimitsInput } from './types';

export const systemKeys = {
  all: ['credit-system'] as const,
  settings: ['credit-system', 'settings'] as const,
  pilot: ['credit-system', 'pilot'] as const,
  limits: ['credit-system', 'limits'] as const,
  dashboard: (filters: Filters) => ['credit-system', 'dashboard', filters] as const,
  operations: (filters: Filters) => ['credit-system', 'operations', filters] as const,
  turn: (turnId: string) => ['credit-system', 'turn', turnId] as const,
};

export const useCreditSettings = () => useQuery({ queryKey: systemKeys.settings, queryFn: creditSystemApi.settings, retry: false });
export const usePilotWorkspaces = () => useQuery({ queryKey: systemKeys.pilot, queryFn: creditSystemApi.pilotWorkspaces, retry: false });
export const useWorkspaceLimits = () => useQuery({ queryKey: systemKeys.limits, queryFn: creditSystemApi.limits, retry: false });
export const useCreditDashboard = (filters: Filters) => useQuery({ queryKey: systemKeys.dashboard(filters), queryFn: () => creditSystemApi.dashboard(filters), retry: false });
export const useTurn = (turnId: string | null) => useQuery({ queryKey: systemKeys.turn(turnId ?? ''), queryFn: () => creditSystemApi.turn(turnId!), enabled: Boolean(turnId), retry: false });

export const useOperations = (filters: Filters) =>
  useInfiniteQuery({
    queryKey: systemKeys.operations(filters),
    queryFn: ({ pageParam }) => creditSystemApi.operations(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: false,
  });

/** After any change, everything the page shows is read again from the API, so it shows what the database holds and not what was typed. */
function useSettingsMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: systemKeys.all }), queryClient.invalidateQueries({ queryKey: ['ai-credits'] })]),
  });
}

export const useSaveFinancial = () => useSettingsMutation((input: FinancialInput) => creditSystemApi.saveFinancial(input));
export const useSaveCostUnit = () => useSettingsMutation((input: CostUnitInput) => creditSystemApi.saveCostUnit(input));
export const useSetMode = () => useSettingsMutation((mode: CreditMode) => creditSystemApi.setMode(mode));
export const useSetPilotRestriction = () => useSettingsMutation((input: { expectedVersion: number; enabled: boolean }) => creditSystemApi.setPilotRestriction(input.expectedVersion, input.enabled));
export const useAddPilotWorkspace = () => useSettingsMutation((input: { organizationId: string; note: string }) => creditSystemApi.addPilotWorkspace(input.organizationId, input.note));
export const useRemovePilotWorkspace = () => useSettingsMutation((organizationId: string) => creditSystemApi.removePilotWorkspace(organizationId));
export const useSaveLimits = () => useSettingsMutation((input: { organizationId: string; limits: LimitsInput }) => creditSystemApi.saveLimits(input.organizationId, input.limits));
export const useRemoveLimits = () => useSettingsMutation((organizationId: string) => creditSystemApi.removeLimits(organizationId));
export const usePreview = () => useMutation({ mutationFn: (verifiedCostUsd: string) => creditSystemApi.preview(verifiedCostUsd) });
