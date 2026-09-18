import { useAuthStore } from '@/store/authStore';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/lib/permissions';
import type { Permission } from '@/types/auth';

/**
 * Reads the resolved permission list from the current admin session and exposes the three check helpers from
 * `lib/permissions.ts` bound to it.
 *
 * IMPORTANT: this only ever controls what the UI shows or hides — a button hidden here is not a security
 * boundary. Anyone can read the bundled JS, forge a client-side session, or call `ormitech-api` directly. Every
 * write this UI makes must be independently authorized by ormitech-api using the admin's real session, not by
 * trusting anything this hook reports.
 */
export function usePermissions() {
  const permissions = useAuthStore((state) => state.admin?.permissions ?? []);

  return {
    permissions,
    can: (permission?: Permission) => hasPermission(permissions, permission),
    canAny: (required: Permission[]) => hasAnyPermission(permissions, required),
    canAll: (required: Permission[]) => hasAllPermissions(permissions, required),
  };
}
