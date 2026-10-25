import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementsApi } from './announcementsApi';
import type { AnnouncementInput } from './types';

const KEY = ['announcements'] as const;

export const useAnnouncements = () => useQuery({ queryKey: KEY, queryFn: announcementsApi.list });

function useInvalidating<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) });
}

export const useCreateAnnouncement = () => useInvalidating((input: AnnouncementInput) => announcementsApi.create(input));
export const useUpdateAnnouncement = () => useInvalidating(({ id, input }: { id: string; input: Partial<AnnouncementInput> }) => announcementsApi.update(id, input));
export const useDeleteAnnouncement = () => useInvalidating((id: string) => announcementsApi.remove(id));
