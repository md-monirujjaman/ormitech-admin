import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/authApi';
import { useAuthStore } from '@/store/authStore';
import type { ForgotPasswordRequest, LoginCredentials } from '@/types/auth';

export function useAuth() {
  const admin = useAuthStore((state) => state.admin);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (session) => setSession(session),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (payload: ForgotPasswordRequest) => authApi.forgotPassword(payload),
  });

  return {
    admin,
    isAuthenticated,
    hasHydrated,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isSendingReset: forgotPasswordMutation.isPending,
    forgotPasswordError: forgotPasswordMutation.error,
    resetSent: forgotPasswordMutation.isSuccess,
    logout,
  };
}
