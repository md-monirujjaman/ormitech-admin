import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/authApi';
import { useAuthStore } from '@/store/authStore';
import type { ChangePasswordInput, ForgotPasswordRequest, LoginCredentials } from '@/types/auth';

export function useAuth() {
  const admin = useAuthStore((state) => state.admin);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const setAdmin = useAuthStore((state) => state.setAdmin);
  const clearSession = useAuthStore((state) => state.logout);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (session) => setSession(session),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (payload: ForgotPasswordRequest) => authApi.forgotPassword(payload),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (input: { name: string }) => authApi.updateProfile(input),
    onSuccess: (updated) => setAdmin(updated),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (input: ChangePasswordInput) => authApi.changePassword(input),
  });

  /**
   * Tells the API to revoke the session before clearing it here.
   *
   * Local state alone would leave the refresh token usable until it expired, so the network call comes first
   * — and its failure is ignored, because an administrator who clicked sign out must end up signed out.
   */
  const logout = async () => {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
    clearSession();
  };

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
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    profileError: updateProfileMutation.error,
    profileSaved: updateProfileMutation.isSuccess,
    changePassword: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
    passwordError: changePasswordMutation.error,
    passwordChanged: changePasswordMutation.data,
    logout,
  };
}
