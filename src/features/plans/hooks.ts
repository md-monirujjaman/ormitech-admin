import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dataSource } from '@/api/dataSource';
import { AUDIT_ACTIONS, buildAuditEvent, recordAuditEvent } from '@/lib/audit';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/authStore';
import type { PlanInput } from '@/types/plan';

function useActingAdminId() {
  return useAuthStore((state) => state.admin?.id ?? 'unknown-admin');
}

export function usePlans() {
  return useQuery({ queryKey: queryKeys.plans.all, queryFn: () => dataSource.listPlans(), staleTime: 60_000 });
}

export function usePlan(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.plans.detail(id ?? ''),
    queryFn: () => dataSource.getPlan(id!),
    enabled: Boolean(id),
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: (input: PlanInput) => dataSource.createPlan(input),
    onSuccess: (plan) => {
      recordAuditEvent(buildAuditEvent(adminId, AUDIT_ACTIONS.planCreated, 'plan', plan.id, { name: plan.name }));
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
    },
  });
}

export function useUpdatePlan(id: string) {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: (input: PlanInput) => dataSource.updatePlan(id, input),
    onSuccess: (plan) => {
      recordAuditEvent(buildAuditEvent(adminId, AUDIT_ACTIONS.planUpdated, 'plan', id, { name: plan.name }));
      queryClient.invalidateQueries({ queryKey: queryKeys.plans.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}
