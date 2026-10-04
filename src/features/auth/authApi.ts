import { axiosClient } from '@/api/axiosClient';
import { resolvePermissions } from '@/lib/permissions';
import type {
  AdminApiProfile,
  AdminUser,
  AuthSession,
  ChangePasswordInput,
  ForgotPasswordRequest,
  LoginCredentials,
  RoleName,
} from '@/types/auth';

/**
 * Admin UI → ormitech-api → `platform_admins` → session → Admin UI.
 *
 * Every response comes wrapped in the API's `{ success, data }` envelope, which `unwrap` removes so the rest
 * of the app never sees it.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Access token lifetime in seconds. */
  expiresIn: number;
  admin: AdminApiProfile;
}

/**
 * The API's role names, mapped onto the roles this UI knows how to render.
 *
 * `super_admin` is the only role the API enforces: it gates administrator management, and nothing else.
 * Everyone else is an operator with the same reach minus that — which is exactly the UI's `ADMIN`, defined as
 * every permission except `admin_users.write` and `roles.write`. So the mapping is two cases, and it stays
 * honest as long as the API's rule stays one role.
 */
function toUiRoles(roles: string[]): RoleName[] {
  return roles.includes('super_admin') ? ['SUPER_ADMIN'] : ['ADMIN'];
}

export function toAdminUser(profile: AdminApiProfile): AdminUser {
  const roles = toUiRoles(profile.roles);
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    roles,
    permissions: resolvePermissions(roles),
    createdAt: profile.createdAt,
    lastLoginAt: profile.lastLoginAt ?? undefined,
  };
}

const toSession = (response: AdminLoginResponse): AuthSession => ({
  admin: toAdminUser(response.admin),
  accessToken: response.accessToken,
  refreshToken: response.refreshToken,
  expiresAt: new Date(Date.now() + response.expiresIn * 1_000).toISOString(),
});

export const authApi = {
  login: (credentials: LoginCredentials) =>
    unwrap<AdminLoginResponse>(axiosClient.post('/admin/auth/login', credentials)).then(toSession),

  /** The signed-in administrator, re-read from the API rather than trusted from storage. */
  me: () => unwrap<{ admin: AdminApiProfile }>(axiosClient.get('/admin/auth/me')).then((data) => toAdminUser(data.admin)),

  updateProfile: (input: { name: string }) =>
    unwrap<{ admin: AdminApiProfile }>(axiosClient.patch('/admin/auth/profile', input)).then((data) =>
      toAdminUser(data.admin),
    ),

  /** Ends every other session of this administrator; this one survives. */
  changePassword: (input: ChangePasswordInput) =>
    unwrap<{ sessionsRevoked: number }>(axiosClient.patch('/admin/auth/password', input)),

  /**
   * Not implemented by ormitech-api: there is no password reset for platform administrators, by design — a
   * reset link to an operator's mailbox is a second way into the panel. A super_admin sets a colleague's
   * password instead. The call is kept so the existing screen compiles and fails visibly rather than
   * appearing to send something.
   */
  forgotPassword: (payload: ForgotPasswordRequest) =>
    axiosClient.post<{ message: string }>('/admin/auth/forgot-password', payload).then((res) => res.data),

  logout: (refreshToken: string) => axiosClient.post<void>('/admin/auth/logout', { refreshToken }).then((res) => res.data),
};
