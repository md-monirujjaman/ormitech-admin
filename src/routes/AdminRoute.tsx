import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { ROUTES } from '@/lib/constants';
import type { Permission } from '@/types/auth';

/**
 * Gates a route (or a subtree, used as a layout route without `children`) behind a permission. This is a UI
 * convenience only — see `hooks/usePermissions.ts` — real enforcement happens on ormitech-api. An admin missing
 * the permission is redirected to the dashboard rather than shown the page.
 */
export function AdminRoute({ permission, children }: { permission?: Permission; children?: ReactNode }) {
  const { can } = usePermissions();

  if (!can(permission)) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
