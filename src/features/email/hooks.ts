import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { emailApi } from './emailApi';
import type { DeliveryQuery, PreviewRequest, TemplateSource } from './types';

export const useTemplates = () => useQuery({ queryKey: queryKeys.email.templates, queryFn: emailApi.list });
export const useTemplate = (key: string) => useQuery({ queryKey: queryKeys.email.template(key), queryFn: () => emailApi.get(key) });
export const useVersions = (key: string) => useQuery({ queryKey: queryKeys.email.versions(key), queryFn: () => emailApi.versions(key) });
export const useVersion = (key: string, version: number | null) =>
  useQuery({ queryKey: queryKeys.email.version(key, version ?? 0), queryFn: () => emailApi.version(key, version!), enabled: version !== null });
export const useDeliveryLogs = (query: DeliveryQuery) =>
  useInfiniteQuery({
    queryKey: queryKeys.email.logs(query),
    queryFn: ({ pageParam }) => emailApi.logs(query, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next ?? undefined,
  });

/** A write to a template: its detail, its versions and the list that shows its status are all read again afterwards. */
function useTemplateWrite<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.email.templates }),
  });
}

export const useSaveDraft = (key: string) => useTemplateWrite((source: TemplateSource) => emailApi.saveDraft(key, source));
export const useDiscardDraft = (key: string) => useTemplateWrite(() => emailApi.discardDraft(key));
export const usePublish = (key: string) => useTemplateWrite((note?: string) => emailApi.publish(key, note));
export const useSetEnabled = (key: string) => useTemplateWrite((enabled: boolean) => emailApi.setEnabled(key, enabled));
export const useRestore = (key: string) => useTemplateWrite(({ version, note }: { version: number; note?: string }) => emailApi.restore(key, version, note));
export const useSendTest = (key: string) => useMutation({ mutationFn: ({ to, useDraft }: { to: string; useDraft: boolean }) => emailApi.sendTest(key, to, useDraft) });

/** The rendered email for what is on screen. A preview is a POST, but it changes nothing, so it is a query. */
export const usePreview = (key: string, request: PreviewRequest, enabled = true) =>
  useQuery({
    queryKey: [...queryKeys.email.template(key), 'preview', request],
    queryFn: () => emailApi.preview(key, request),
    enabled,
    retry: false,
    placeholderData: (previous) => previous,
  });

export function useRetryDelivery() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id: string) => emailApi.retry(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email', 'logs'] }) });
}
