/**
 * Every permission the Admin UI knows how to gate a control behind. This list is UI-side only — see
 * `lib/permissions.ts` for why it can never substitute for authorization enforced by ormitech-api.
 */
export type Permission =
  | 'organizations.read'
  | 'organizations.write'
  | 'users.read'
  | 'users.write'
  | 'conversations.read'
  | 'conversations.write'
  | 'leads.read'
  | 'leads.write'
  | 'plans.read'
  | 'plans.write'
  | 'features.read'
  | 'features.write'
  | 'ai.read'
  | 'ai.write'
  | 'channels.read'
  | 'channels.write'
  | 'billing.read'
  | 'billing.write'
  | 'subscriptions.read'
  | 'subscriptions.write'
  | 'payments.read'
  | 'payments.write'
  | 'invoices.read'
  | 'invoices.write'
  | 'usage.read'
  | 'docs.read'
  | 'docs.write'
  | 'announcements.read'
  | 'announcements.write'
  | 'api.read'
  | 'api.write'
  | 'webhooks.read'
  | 'webhooks.write'
  | 'integrations.read'
  | 'integrations.write'
  | 'system.read'
  | 'jobs.read'
  | 'jobs.write'
  | 'admin_users.read'
  | 'admin_users.write'
  | 'roles.read'
  | 'roles.write'
  | 'audit.read'
  | 'security.read'
  | 'settings.read'
  | 'settings.write'
  | 'email.read'
  | 'email.write'
  | 'notifications.read'
  | 'notifications.write'
  | 'feature_flags.read'
  | 'feature_flags.write'
  | 'support.read'
  | 'support.write';

export type RoleName = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT_ADMIN' | 'BILLING_ADMIN' | 'CONTENT_ADMIN' | 'ANALYTICS_ADMIN';

export interface Role {
  name: RoleName;
  label: string;
  description: string;
  permissions: Permission[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  roles: RoleName[];
  /** Resolved (union of all role) permissions — what `usePermissions()` actually checks against. */
  permissions: Permission[];
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * What `ormitech-api` returns for an administrator, and the only authority on their roles.
 *
 * The role names are rows in the API's `admin_roles` table — `super_admin` is the one the API enforces. They
 * are mapped onto the UI's own `RoleName` by `features/auth/authApi.ts`, because what this app does with a
 * role is decide which controls to render, and that mapping belongs at the edge rather than in every screen.
 */
export interface AdminApiProfile {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'disabled' | string;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

/** A platform administrator as the administrator management screen lists them. */
export interface AdminAccount extends AdminApiProfile {
  mfaEnabled: boolean;
}

export interface AdminListParams {
  search?: string;
  status?: 'active' | 'disabled';
  page?: number;
  limit?: number;
}

export interface CreateAdminInput {
  email: string;
  name: string;
  password: string;
  roles?: string[];
}

export interface UpdateAdminInput {
  name?: string;
  status?: 'active' | 'disabled';
  roles?: string[];
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

/**
 * The session this app holds after signing in.
 *
 * `accessToken` is short-lived and `refreshToken` is single-use — the API rotates it on every refresh and
 * revokes the session if an already-used one comes back. Neither is ever inspected here: authorization is the
 * API's, and `admin.permissions` only decides what to render.
 */
export interface AuthSession {
  admin: AdminUser;
  accessToken: string;
  refreshToken: string;
  /** When the access token expires, ISO 8601. */
  expiresAt: string;
}
