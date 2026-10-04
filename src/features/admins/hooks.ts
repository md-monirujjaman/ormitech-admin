import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminListParams, CreateAdminInput, UpdateAdminInput } from '@/types/auth';
import { adminsApi } from './adminsApi';

export function useAdmins(params: AdminListParams) {
  return useQuery({
    queryKey: queryKeys.admins.list(params),
    queryFn: () => adminsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: queryKeys.admins.roles,
    queryFn: () => adminsApi.roles(),
    // The set is seeded by a migration, so it does not change while the panel is open.
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminInput) => adminsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admins.all }),
  });
}

export function useUpdateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAdminInput }) => adminsApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admins.all }),
  });
}
