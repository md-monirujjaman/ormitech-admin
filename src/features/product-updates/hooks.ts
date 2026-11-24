import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productUpdatesApi } from './productUpdatesApi';
import type { ProductUpdateInput } from './types';

const KEY = ['product-updates'] as const;

export const useProductUpdates = () => useQuery({ queryKey: KEY, queryFn: productUpdatesApi.list });

function useInvalidating<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }) });
}

export const useCreateProductUpdate = () => useInvalidating((input: ProductUpdateInput) => productUpdatesApi.create(input));
export const useUpdateProductUpdate = () => useInvalidating(({ id, input }: { id: string; input: Partial<ProductUpdateInput> }) => productUpdatesApi.update(id, input));
export const useDeleteProductUpdate = () => useInvalidating((id: string) => productUpdatesApi.remove(id));
