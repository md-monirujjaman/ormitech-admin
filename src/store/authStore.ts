import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAccessToken, setUnauthorizedHandler } from '@/api/axiosClient';
import type { AdminUser, AuthSession } from '@/types/auth';

interface AuthState {
  admin: AdminUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setSession: (session: AuthSession) => void;
  /** Replaces the stored administrator after a profile change, without touching the session. */
  setAdmin: (admin: AdminUser) => void;
  logout: () => void;
}

/**
 * Holds the admin's session client-side only — the access token is opaque here, never inspected or trusted for
 * authorization. `axiosClient` is told about token changes through `setAccessToken`/`setUnauthorizedHandler`
 * rather than importing this store, so the two modules don't form a cycle.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      setSession: (session) => {
        setAccessToken(session.accessToken);
        set({
          admin: session.admin,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          isAuthenticated: true,
        });
      },
      setAdmin: (admin) => set({ admin }),
      logout: () => {
        setAccessToken(null);
        set({ admin: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'ormitech-admin-auth',
      partialize: (state) => ({
        admin: state.admin,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
        // Mutating `state` here doesn't notify subscribers — go through `setState` so ProtectedRoute re-renders.
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);

setUnauthorizedHandler(() => useAuthStore.getState().logout());
