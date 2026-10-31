import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blogApi } from './blogApi';
import type { BlogPostInput } from './types';

const KEY = ['blog'] as const;

export function useBlogPosts(params: { status?: string; q?: string }) {
  return useQuery({ queryKey: [...KEY, 'list', params], queryFn: () => blogApi.list(params), placeholderData: keepPreviousData });
}

export function useBlogPost(id: string | null) {
  return useQuery({ queryKey: [...KEY, 'post', id], queryFn: () => blogApi.get(id as string), enabled: id !== null, staleTime: 0, refetchOnWindowFocus: false });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BlogPostInput & { title: string }) => blogApi.create(input),
    onSuccess: (post) => {
      queryClient.setQueryData([...KEY, 'post', post.id], post);
      return queryClient.invalidateQueries({ queryKey: [...KEY, 'list'] });
    },
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BlogPostInput }) => blogApi.update(id, input),
    onSuccess: (post) => {
      queryClient.setQueryData([...KEY, 'post', post.id], post);
      return queryClient.invalidateQueries({ queryKey: [...KEY, 'list'] });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id: string) => blogApi.remove(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) });
}

export const useUploadBlogImage = () => useMutation({ mutationFn: (file: File) => blogApi.uploadImage(file) });
