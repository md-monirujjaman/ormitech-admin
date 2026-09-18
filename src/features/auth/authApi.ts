import { axiosClient } from '@/api/axiosClient';
import type { AuthSession, ForgotPasswordRequest, LoginCredentials } from '@/types/auth';

/**
 * Admin UI → ormitech-api → admin authentication endpoint → secure session/access token → Admin UI.
 *
 * These endpoints don't exist on ormitech-api yet. Calling `login`/`forgotPassword` today will fail with a
 * network error against whatever `VITE_API_URL` points at — that's intentional: this module is the seam the
 * real integration lands in, not a working feature. Nothing here fabricates a successful response.
 */
export const authApi = {
  login: (credentials: LoginCredentials) => axiosClient.post<AuthSession>('/admin/auth/login', credentials).then((res) => res.data),

  forgotPassword: (payload: ForgotPasswordRequest) =>
    axiosClient.post<{ message: string }>('/admin/auth/forgot-password', payload).then((res) => res.data),

  logout: () => axiosClient.post<void>('/admin/auth/logout').then((res) => res.data),
};
