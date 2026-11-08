import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tutorialsApi } from './tutorialsApi';
import type { CategoryInput, TutorialInput } from './types';

const KEY = ['tutorials'] as const;

export const useTutorials = () => useQuery({ queryKey: KEY, queryFn: tutorialsApi.list });

function useInvalidating<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) });
}

export const useCreateCategory = () => useInvalidating((input: CategoryInput) => tutorialsApi.createCategory(input));
export const useUpdateCategory = () => useInvalidating(({ id, input }: { id: string; input: Partial<CategoryInput> }) => tutorialsApi.updateCategory(id, input));
export const useDeleteCategory = () => useInvalidating((id: string) => tutorialsApi.removeCategory(id));
export const useCreateTutorial = () => useInvalidating((input: TutorialInput) => tutorialsApi.create(input));
export const useUpdateTutorial = () => useInvalidating(({ id, input }: { id: string; input: Partial<TutorialInput> }) => tutorialsApi.update(id, input));
export const useDeleteTutorial = () => useInvalidating((id: string) => tutorialsApi.remove(id));
