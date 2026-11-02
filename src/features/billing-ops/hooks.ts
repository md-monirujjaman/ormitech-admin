import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingOpsApi } from './billingOpsApi';
import type { CreateInvoiceInput, RecordPaymentInput, SetAllowanceInput } from './types';

const keys = {
  allowance: (planId: string) => ['billing-ops', 'allowance', planId] as const,
  consistency: ['billing-ops', 'consistency'] as const,
};

export const usePlanAllowance = (planId: string) => useQuery({ queryKey: keys.allowance(planId), queryFn: () => billingOpsApi.allowance(planId), retry: false });
export const useConsistency = () => useQuery({ queryKey: keys.consistency, queryFn: billingOpsApi.consistency, retry: false });

/** After any billing write, what the billing screens show is read again from the API. */
function useBillingMutation<TInput, TResult>(run: (input: TInput) => Promise<TResult>, extra?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      extra?.();
      void queryClient.invalidateQueries();
    },
  });
}

export const useSetAllowance = (planId: string) => useBillingMutation((input: SetAllowanceInput) => billingOpsApi.setAllowance(planId, input));
export const useClearAllowance = (planId: string) => useBillingMutation(() => billingOpsApi.clearAllowance(planId));
export const useAllocateCredits = (subscriptionId: string) => useBillingMutation((reason: string) => billingOpsApi.allocate(subscriptionId, reason));
export const useChangeSubscriptionPlan = (subscriptionId: string) => useBillingMutation((input: { planId: string; reason: string }) => billingOpsApi.changePlan(subscriptionId, input.planId, input.reason));
export const useCreateInvoice = () => useBillingMutation((input: CreateInvoiceInput) => billingOpsApi.createInvoice(input));
export const useIssueInvoice = () => useBillingMutation((input: { invoiceId: string; dueAt?: string }) => billingOpsApi.issueInvoice(input.invoiceId, input.dueAt));
export const useRecordPayment = () => useBillingMutation((input: { invoiceId: string; payment: RecordPaymentInput }) => billingOpsApi.recordPayment(input.invoiceId, input.payment));
