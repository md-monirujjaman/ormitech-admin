import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fastSupportApi } from './api';
import type { CreateModeratorInput, SupportPermission, SupportScope } from './types';

export const KEYS = {
  all: ['fast-support'] as const,
  me: ['fast-support', 'me'] as const,
  overview: ['fast-support', 'overview'] as const,
  list: (scope: SupportScope, search: string) => ['fast-support', 'list', scope, search] as const,
  detail: (id: string) => ['fast-support', 'detail', id] as const,
  notifications: ['fast-support', 'notifications'] as const,
  moderators: ['fast-support', 'moderators'] as const,
};

export const useSupportMe = () => useQuery({ queryKey: KEYS.me, queryFn: fastSupportApi.me, staleTime: 60_000 });
export const useSupportOverview = () => useQuery({ queryKey: KEYS.overview, queryFn: fastSupportApi.overview });
export const useSupportList = (scope: SupportScope, search: string) => useQuery({ queryKey: KEYS.list(scope, search), queryFn: () => fastSupportApi.list({ scope, search: search || undefined, limit: 50 }) });
export const useSupportDetail = (id: string) => useQuery({ queryKey: KEYS.detail(id), queryFn: () => fastSupportApi.detail(id) });
export const useSupportNotifications = () => useQuery({ queryKey: KEYS.notifications, queryFn: fastSupportApi.notifications });
export const useModerators = (enabled: boolean) => useQuery({ queryKey: KEYS.moderators, queryFn: fastSupportApi.moderators, enabled });

/** Every change refreshes what the screens show, so the database stays the source of truth. */
function useChange<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => queryClient.invalidateQueries({ queryKey: KEYS.all }) });
}

export const useAccept = () => useChange((id: string) => fastSupportApi.accept(id));
export const useReply = () => useChange(({ id, body, file }: { id: string; body: string; file?: File | null }) => fastSupportApi.reply(id, body, file));
export const useSetAi = () => useChange(({ id, enabled }: { id: string; enabled: boolean }) => fastSupportApi.setAi(id, enabled));
export const useAddNote = () => useChange(({ id, body }: { id: string; body: string }) => fastSupportApi.addNote(id, body));
export const useSetStatus = () => useChange(({ id, status }: { id: string; status: 'waiting_for_customer' | 'human_active' | 'ai_troubleshooting' }) => fastSupportApi.setStatus(id, status));
export const useResolve = () => useChange((id: string) => fastSupportApi.resolve(id));
export const useReopen = () => useChange((id: string) => fastSupportApi.reopen(id));
export const useReassign = () => useChange(({ id, moderatorId }: { id: string; moderatorId: string }) => fastSupportApi.reassign(id, moderatorId));
export const useMarkNotificationsRead = () => useChange(() => fastSupportApi.markNotificationsRead());
export const useCreateModerator = () => useChange((input: CreateModeratorInput) => fastSupportApi.createModerator(input));
export const useUpdateModerator = () => useChange(({ id, ...input }: { id: string; name?: string; active?: boolean; permissions?: SupportPermission[] }) => fastSupportApi.updateModerator(id, input));
