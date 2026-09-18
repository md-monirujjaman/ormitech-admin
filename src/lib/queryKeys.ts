import type { InvoiceListParams, PaymentListParams, SubscriptionListParams } from '@/types/billing';
import type { OrganizationListParams } from '@/types/organization';

/** Every TanStack Query key in one place, so invalidation after a mutation can't miss a screen. */
export const queryKeys = {
  catalog: {
    features: ['catalog', 'features'] as const,
    channels: ['catalog', 'channels'] as const,
    limits: ['catalog', 'limits'] as const,
  },
  plans: {
    all: ['plans'] as const,
    detail: (id: string) => ['plans', id] as const,
  },
  organizations: {
    all: ['organizations'] as const,
    list: (params: OrganizationListParams) => ['organizations', 'list', params] as const,
    detail: (id: string) => ['organizations', 'detail', id] as const,
    usage: (id: string) => ['organizations', 'detail', id, 'usage'] as const,
    users: (id: string) => ['organizations', 'detail', id, 'users'] as const,
  },
  billing: {
    /** Root key — invalidating this refreshes every billing screen after a mutation. */
    all: ['billing'] as const,
    summary: ['billing', 'summary'] as const,
    charts: ['billing', 'charts'] as const,
    subscriptions: (params: SubscriptionListParams) => ['billing', 'subscriptions', params] as const,
    subscription: (id: string) => ['billing', 'subscription', id] as const,
    subscriptionByOrganization: (organizationId: string) => ['billing', 'subscription', 'organization', organizationId] as const,
    payments: (params: PaymentListParams) => ['billing', 'payments', params] as const,
    invoices: (params: InvoiceListParams) => ['billing', 'invoices', params] as const,
    usage: ['billing', 'usage'] as const,
  },
};
