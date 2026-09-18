import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dataSource } from '@/api/dataSource';
import { AUDIT_ACTIONS, buildAuditEvent, recordAuditEvent } from '@/lib/audit';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/authStore';
import type { InvoiceListParams, PaymentListParams, SubscriptionListParams, SubscriptionStatus } from '@/types/billing';

function useActingAdminId() {
  return useAuthStore((state) => state.admin?.id ?? 'unknown-admin');
}

export function useBillingSummary() {
  return useQuery({ queryKey: queryKeys.billing.summary, queryFn: () => dataSource.getBillingSummary() });
}

export function useBillingCharts() {
  return useQuery({ queryKey: queryKeys.billing.charts, queryFn: () => dataSource.getBillingCharts() });
}

export function useSubscriptions(params: SubscriptionListParams) {
  return useQuery({
    queryKey: queryKeys.billing.subscriptions(params),
    queryFn: () => dataSource.listSubscriptions(params),
    placeholderData: keepPreviousData,
  });
}

export function useSubscription(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.billing.subscription(id ?? ''),
    queryFn: () => dataSource.getSubscription(id!),
    enabled: Boolean(id),
  });
}

export function useSubscriptionByOrganization(organizationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.billing.subscriptionByOrganization(organizationId ?? ''),
    queryFn: () => dataSource.getSubscriptionByOrganization(organizationId!),
    enabled: Boolean(organizationId),
  });
}

/** Pause / resume / cancel / reactivate all go through here, so lifecycle changes have one audited path. */
export function useSetSubscriptionStatus() {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubscriptionStatus }) => dataSource.setSubscriptionStatus(id, status),
    onSuccess: (subscription, variables) => {
      const action =
        variables.status === 'PAUSED'
          ? AUDIT_ACTIONS.subscriptionPaused
          : variables.status === 'CANCELLED'
            ? AUDIT_ACTIONS.subscriptionCancelled
            : variables.status === 'ACTIVE'
              ? AUDIT_ACTIONS.subscriptionResumed
              : AUDIT_ACTIONS.subscriptionUpdated;

      recordAuditEvent(
        buildAuditEvent(adminId, action, 'subscription', variables.id, {
          organizationId: subscription.organizationId,
          status: subscription.status,
        }),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
  });
}

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: queryKeys.billing.payments(params),
    queryFn: () => dataSource.listPayments(params),
    placeholderData: keepPreviousData,
  });
}

export function useInvoices(params: InvoiceListParams) {
  return useQuery({
    queryKey: queryKeys.billing.invoices(params),
    queryFn: () => dataSource.listInvoices(params),
    placeholderData: keepPreviousData,
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: (id: string) => dataSource.voidInvoice(id),
    onSuccess: (invoice) => {
      recordAuditEvent(
        buildAuditEvent(adminId, AUDIT_ACTIONS.invoiceVoided, 'invoice', invoice.id, {
          organizationId: invoice.organizationId,
          number: invoice.number,
        }),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
    },
  });
}

/** Platform-wide usage, one row per organization. */
export function usePlatformUsage() {
  return useQuery({ queryKey: queryKeys.billing.usage, queryFn: () => dataSource.listUsage() });
}
