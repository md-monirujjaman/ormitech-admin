import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardAgentApi } from './dashboardAgentApi';

const OVERVIEW = ['dashboard-agent', 'overview'] as const;
const FEEDBACK = ['dashboard-agent', 'feedback'] as const;

export const useAgentOverview = () => useQuery({ queryKey: OVERVIEW, queryFn: dashboardAgentApi.overview });

export const useAgentFeedback = () =>
  useInfiniteQuery({
    queryKey: FEEDBACK,
    queryFn: ({ pageParam }) => dashboardAgentApi.feedback(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next ?? undefined,
  });

export function useSaveAgentModels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dashboardAgentApi.saveModels,
    onSuccess: (overview) => queryClient.setQueryData(OVERVIEW, overview),
  });
}
