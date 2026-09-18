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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

/** What `ormitech-api`'s admin auth endpoint is expected to return once it exists. */
export interface AuthSession {
  admin: AdminUser;
  accessToken: string;
  expiresAt: string;
}
