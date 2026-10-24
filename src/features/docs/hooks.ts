import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { docsApi } from './docsApi';
import type { CreatePageInput, CreateSectionInput, ReorderInput, UpdatePageInput, UpdateSectionInput } from './types';

const KEY = ['docs'] as const;

export function useDocsTree() {
  return useQuery({ queryKey: [...KEY, 'tree'], queryFn: docsApi.tree });
}

export function useDocIcons() {
  return useQuery({ queryKey: [...KEY, 'icons'], queryFn: docsApi.icons, staleTime: Number.POSITIVE_INFINITY });
}

export function useDocPage(id: string | null) {
  return useQuery({ queryKey: [...KEY, 'page', id], queryFn: () => docsApi.page(id as string), enabled: id !== null });
}

function useInvalidating<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) });
}

export const useCreateSection = () => useInvalidating((input: CreateSectionInput) => docsApi.createSection(input));
export const useUpdateSection = () => useInvalidating(({ id, input }: { id: string; input: UpdateSectionInput }) => docsApi.updateSection(id, input));
export const useDeleteSection = () => useInvalidating((id: string) => docsApi.deleteSection(id));
export const useCreatePage = () => useInvalidating((input: CreatePageInput) => docsApi.createPage(input));
export const useUpdatePage = () => useInvalidating(({ id, input }: { id: string; input: UpdatePageInput }) => docsApi.updatePage(id, input));
export const useDeletePage = () => useInvalidating((id: string) => docsApi.deletePage(id));
export const useReorderDocs = () => useInvalidating((input: ReorderInput) => docsApi.reorder(input));
export const useUploadDocImage = () => useMutation({ mutationFn: (file: File) => docsApi.uploadImage(file) });
