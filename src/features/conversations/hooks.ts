import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { crmApi } from '@/api/crmApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminConversationListParams } from '@/types/crm';

export function useConversations(organizationId: string | undefined, params: AdminConversationListParams) {
  return useQuery({
    queryKey: queryKeys.conversations.list(organizationId ?? '', params),
    queryFn: () => crmApi.listConversations(organizationId!, params),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });
}

export function useConversation(organizationId: string | undefined, conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.conversations.detail(organizationId ?? '', conversationId ?? ''),
    queryFn: () => crmApi.getConversation(organizationId!, conversationId!),
    enabled: Boolean(organizationId && conversationId),
  });
}

/**
 * One page of a thread, oldest first.
 *
 * `asc` because a thread reads top to bottom: the endpoint defaults to newest first for a caller that wants
 * only the latest, and a reader wants the opposite.
 */
export function useMessages(organizationId: string | undefined, conversationId: string | undefined, page: number) {
  return useQuery({
    queryKey: queryKeys.conversations.messages(organizationId ?? '', conversationId ?? '', page),
    queryFn: () => crmApi.listMessages(organizationId!, conversationId!, { page, limit: 50, order: 'asc' }),
    enabled: Boolean(organizationId && conversationId),
    placeholderData: keepPreviousData,
  });
}

export function useMemberActivity(organizationId: string | undefined, memberId: string | undefined, page: number) {
  return useQuery({
    queryKey: queryKeys.members.activity(organizationId ?? '', memberId ?? '', page),
    queryFn: () => crmApi.listMemberActivity(organizationId!, memberId!, { page, limit: 20 }),
    enabled: Boolean(organizationId && memberId),
    placeholderData: keepPreviousData,
  });
}

export function useMemberSessions(organizationId: string | undefined, memberId: string | undefined, page: number) {
  return useQuery({
    queryKey: queryKeys.members.sessions(organizationId ?? '', memberId ?? '', page),
    queryFn: () => crmApi.listMemberSessions(organizationId!, memberId!, { page, limit: 20 }),
    enabled: Boolean(organizationId && memberId),
    placeholderData: keepPreviousData,
  });
}
