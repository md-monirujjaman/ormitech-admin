import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/ui/LoadingState';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';

/** Gates every route under `<AdminLayout>` on having a session. Unauthenticated admins are sent to /login. */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const location = useLocation();

  if (!hasHydrated) {
    return <LoadingState label="Loading OrmiTech Admin…" className="min-h-svh" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
