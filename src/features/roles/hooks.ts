import { useMemo } from 'react';
import { useAdminRoles, useAdmins } from '@/features/admins/hooks';
import { ROLE_DEFINITIONS } from '@/lib/permissions';
import type { Permission, RoleName } from '@/types/auth';

/**
 * The role a given `admin_roles.name` means inside this app.
 *
 * The same two cases `features/auth/authApi.ts` applies when it maps a session's roles: `super_admin` is the
 * one role ormitech-api enforces, and every other administrator has the panel's `ADMIN`, which is every
 * permission except administrator and role management. Keeping the mapping in step with that file is the
 * whole job here — if the API ever enforces a second role, both change together.
 */
export const toUiRole = (name: string): RoleName => (name === 'super_admin' ? 'SUPER_ADMIN' : 'ADMIN');

/**
 * What ormitech-api actually refuses without the role, as opposed to what the panel merely hides.
 *
 * Mirrors the `@RequireRole(SUPER_ADMIN_ROLE)` decorators on the API: the administrator controller and the
 * audit log controller carry one, and no other endpoint does. Stated here so the page can tell an operator
 * which half of a role is a security boundary and which half is presentation.
 */
export const ENFORCED_BY_API: Record<RoleName, string[]> = {
  SUPER_ADMIN: [
    'List, create and update platform administrators (/admin/admins)',
    'Assign and withdraw the super_admin role',
    'Read the administrator audit trail (/admin/audit-logs)',
  ],
  ADMIN: [],
  SUPPORT_ADMIN: [],
  BILLING_ADMIN: [],
  CONTENT_ADMIN: [],
  ANALYTICS_ADMIN: [],
};

export interface RoleSummary {
  /** `admin_roles.name`, the value the API stores and checks. */
  name: string;
  description: string;
  /** How many administrators hold it, counted from the administrator list. */
  administrators: number;
  /** The emails of those administrators, so the count can be checked rather than trusted. */
  administratorEmails: string[];
  /** What the API refuses without this role. Empty for every role but super_admin. */
  enforced: string[];
  /** What the panel shows or hides for it — presentation, not authorization. */
  panelPermissions: Permission[];
  uiRole: RoleName;
}

/**
 * The roles the platform defines, with the administrators holding each one.
 *
 * Two requests rather than one: `GET /admin/admins/roles` answers with the role names and descriptions and
 * nothing else — `admin_role_permissions` is not exposed by any endpoint and holds no rows — so the count of
 * administrators per role is assembled from the administrator list, which does carry each one's roles. Both
 * are already-cached queries the Admin Users screen uses.
 */
export function useRoleSummaries() {
  const rolesQuery = useAdminRoles();
  // One page covers it: the platform has a handful of administrators, and the count below says how many were
  // examined so a larger estate cannot silently under-report.
  const adminsQuery = useAdmins({ page: 1, limit: 100 });

  const summaries = useMemo<RoleSummary[]>(() => {
    const roles = rolesQuery.data ?? [];
    const admins = adminsQuery.data?.items ?? [];

    return roles.map((role) => {
      const holders = admins.filter((admin) => admin.roles.includes(role.name));
      const uiRole = toUiRole(role.name);
      return {
        name: role.name,
        description: role.description,
        administrators: holders.length,
        administratorEmails: holders.map((admin) => admin.email),
        enforced: ENFORCED_BY_API[uiRole] ?? [],
        panelPermissions: ROLE_DEFINITIONS.find((definition) => definition.name === uiRole)?.permissions ?? [],
        uiRole,
      };
    });
  }, [rolesQuery.data, adminsQuery.data]);

  return {
    summaries,
    /** How many administrators the counts were taken over, and whether that was all of them. */
    administratorsExamined: adminsQuery.data?.items.length ?? 0,
    administratorsTotal: adminsQuery.data?.meta.total ?? 0,
    isLoading: rolesQuery.isLoading || adminsQuery.isLoading,
    isError: rolesQuery.isError || adminsQuery.isError,
    error: rolesQuery.error ?? adminsQuery.error,
    refetch: () => {
      void rolesQuery.refetch();
      void adminsQuery.refetch();
    },
  };
}
