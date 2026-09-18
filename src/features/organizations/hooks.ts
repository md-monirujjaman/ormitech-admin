import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dataSource } from '@/api/dataSource';
import { AUDIT_ACTIONS, buildAuditEvent, recordAuditEvent } from '@/lib/audit';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/authStore';
import type { AiConfiguration } from '@/types/ai';
import type { EntitlementOverrides } from '@/types/entitlements';
import type {
  OrganizationInput,
  OrganizationListParams,
  OrganizationUserInput,
  OrganizationUserStatus,
  TenantStatus,
} from '@/types/organization';

/** The admin performing the action, for the audit drafts each mutation produces. */
function useActingAdminId() {
  return useAuthStore((state) => state.admin?.id ?? 'unknown-admin');
}

export function useOrganizations(params: OrganizationListParams) {
  return useQuery({
    queryKey: queryKeys.organizations.list(params),
    queryFn: () => dataSource.listOrganizations(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(id ?? ''),
    queryFn: () => dataSource.getOrganization(id!),
    enabled: Boolean(id),
  });
}

export function useOrganizationUsage(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.usage(id ?? ''),
    queryFn: () => dataSource.getUsage(id!),
    enabled: Boolean(id),
  });
}

export function useOrganizationUsers(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.users(id ?? ''),
    queryFn: () => dataSource.listOrganizationUsers(id!),
    enabled: Boolean(id),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: (input: OrganizationInput) => dataSource.createOrganization(input),
    onSuccess: (organization) => {
      recordAuditEvent(buildAuditEvent(adminId, AUDIT_ACTIONS.organizationCreated, 'organization', organization.id, { name: organization.name }));
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: (input: OrganizationInput) => dataSource.updateOrganization(id, input),
    onSuccess: (organization) => {
      recordAuditEvent(buildAuditEvent(adminId, AUDIT_ACTIONS.organizationUpdated, 'organization', id, { name: organization.name }));
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useSetOrganizationStatus(id: string) {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: (status: TenantStatus) => dataSource.setOrganizationStatus(id, status),
    onSuccess: (organization, status) => {
      const action =
        status === 'SUSPENDED'
          ? AUDIT_ACTIONS.organizationSuspended
          : status === 'ACTIVE'
            ? AUDIT_ACTIONS.organizationActivated
            : AUDIT_ACTIONS.organizationStatusChanged;
      recordAuditEvent(buildAuditEvent(adminId, action, 'organization', id, { status: organization.status }));
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useAssignPlan(id: string) {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: (planId: string) => dataSource.assignPlan(id, planId),
    onSuccess: (organization) => {
      recordAuditEvent(buildAuditEvent(adminId, AUDIT_ACTIONS.planAssigned, 'organization', id, { planId: organization.planId }));
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

/**
 * Persists the organization's whole override object at once. `changed` is only used to describe the action in
 * the audit draft — the override object itself is always sent complete, so the server never has to merge.
 */
export function useUpdateOverrides(id: string) {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: ({ overrides }: { overrides: EntitlementOverrides; changed?: { kind: 'feature' | 'channel' | 'limit'; key: string; enabled?: boolean } }) =>
      dataSource.updateOverrides(id, overrides),
    onSuccess: (_organization, variables) => {
      const changed = variables.changed;
      const action = !changed
        ? AUDIT_ACTIONS.limitsUpdated
        : changed.kind === 'feature'
          ? changed.enabled
            ? AUDIT_ACTIONS.featureEnabled
            : AUDIT_ACTIONS.featureDisabled
          : changed.kind === 'channel'
            ? changed.enabled
              ? AUDIT_ACTIONS.channelEnabled
              : AUDIT_ACTIONS.channelDisabled
            : AUDIT_ACTIONS.limitsUpdated;
      recordAuditEvent(buildAuditEvent(adminId, action, 'organization', id, changed ? { ...changed } : undefined));
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useUpdateAiConfiguration(id: string) {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: (configuration: AiConfiguration) => dataSource.updateAiConfiguration(id, configuration),
    onSuccess: () => {
      recordAuditEvent(buildAuditEvent(adminId, AUDIT_ACTIONS.aiSettingsUpdated, 'organization', id));
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useCreateOrganizationUser(organizationId: string) {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: (input: OrganizationUserInput) => dataSource.createOrganizationUser(organizationId, input),
    onSuccess: (user) => {
      recordAuditEvent(buildAuditEvent(adminId, AUDIT_ACTIONS.organizationUserCreated, 'organization_user', user.id, { organizationId }));
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useUpdateOrganizationUser(organizationId: string) {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: OrganizationUserInput }) =>
      dataSource.updateOrganizationUser(organizationId, userId, input),
    onSuccess: (user, variables) => {
      recordAuditEvent(
        buildAuditEvent(adminId, AUDIT_ACTIONS.organizationUserUpdated, 'organization_user', variables.userId, {
          organizationId,
          role: user.role,
        }),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.users(organizationId) });
    },
  });
}

export function useSetOrganizationUserStatus(organizationId: string) {
  const queryClient = useQueryClient();
  const adminId = useActingAdminId();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: OrganizationUserStatus }) =>
      dataSource.setOrganizationUserStatus(organizationId, userId, status),
    onSuccess: (_user, variables) => {
      recordAuditEvent(
        buildAuditEvent(
          adminId,
          variables.status === 'disabled' ? AUDIT_ACTIONS.organizationUserDisabled : AUDIT_ACTIONS.organizationUserEnabled,
          'organization_user',
          variables.userId,
          { organizationId },
        ),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.users(organizationId) });
    },
  });
}
