import type { InvoiceListParams, PaymentListParams, SubscriptionListParams } from '@/types/billing';
import type { AdminListParams } from '@/types/auth';
import type { OrganizationListParams } from '@/types/organization';

/** Every TanStack Query key in one place, so invalidation after a mutation can't miss a screen. */
export const queryKeys = {
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
  },
  catalog: {
    features: ['catalog', 'features'] as const,
    channels: ['catalog', 'channels'] as const,
    limits: ['catalog', 'limits'] as const,
  },
  plans: {
    all: ['plans'] as const,
    detail: (id: string) => ['plans', id] as const,
  },
  admins: {
    all: ['admins'] as const,
    list: (params: AdminListParams) => ['admins', 'list', params] as const,
    roles: ['admins', 'roles'] as const,
  },
  auditLogs: {
    all: ['audit-logs'] as const,
    list: (params: unknown) => ['audit-logs', 'list', params] as const,
  },
  leads: {
    all: ['leads'] as const,
    list: (params: unknown) => ['leads', 'list', params] as const,
    detail: (organizationId: string, leadId: string) => ['leads', organizationId, leadId] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    list: (organizationId: string, params: unknown) => ['conversations', organizationId, 'list', params] as const,
    detail: (organizationId: string, conversationId: string) => ['conversations', organizationId, conversationId] as const,
    messages: (organizationId: string, conversationId: string, page: number) =>
      ['conversations', organizationId, conversationId, 'messages', page] as const,
  },
  members: {
    activity: (organizationId: string, memberId: string, page: number) =>
      ['members', organizationId, memberId, 'activity', page] as const,
    sessions: (organizationId: string, memberId: string, page: number) =>
      ['members', organizationId, memberId, 'sessions', page] as const,
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
