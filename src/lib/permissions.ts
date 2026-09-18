import type { Permission, Role, RoleName } from '@/types/auth';

const ALL_PERMISSIONS: Permission[] = [
  'organizations.read', 'organizations.write',
  'users.read', 'users.write',
  'conversations.read', 'conversations.write',
  'leads.read', 'leads.write',
  'plans.read', 'plans.write',
  'features.read', 'features.write',
  'ai.read', 'ai.write',
  'channels.read', 'channels.write',
  'billing.read', 'billing.write',
  'subscriptions.read', 'subscriptions.write',
  'payments.read', 'payments.write',
  'invoices.read', 'invoices.write',
  'usage.read',
  'docs.read', 'docs.write',
  'announcements.read', 'announcements.write',
  'api.read', 'api.write',
  'webhooks.read', 'webhooks.write',
  'integrations.read', 'integrations.write',
  'system.read',
  'jobs.read', 'jobs.write',
  'admin_users.read', 'admin_users.write',
  'roles.read', 'roles.write',
  'audit.read',
  'security.read',
  'settings.read', 'settings.write',
  'email.read', 'email.write',
  'notifications.read', 'notifications.write',
  'feature_flags.read', 'feature_flags.write',
  'support.read', 'support.write',
];

/**
 * Role → permission mapping the Admin UI ships with today. This governs UI visibility only: which nav items,
 * buttons and pages an admin sees. It is not authorization — see the module comment on `usePermissions` in
 * `hooks/usePermissions.ts`. The real permission check for every write happens on `ormitech-api`, which must
 * enforce its own copy of this mapping (or better, be the single source of truth this file mirrors) independent
 * of anything the browser reports.
 */
export const ROLE_DEFINITIONS: Role[] = [
  {
    name: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Full platform access, including admin user and role management.',
    permissions: ALL_PERMISSIONS,
  },
  {
    name: 'ADMIN',
    label: 'Admin',
    description: 'Full operational access; cannot manage other admin accounts or roles.',
    permissions: ALL_PERMISSIONS.filter((p) => p !== 'admin_users.write' && p !== 'roles.write'),
  },
  {
    name: 'SUPPORT_ADMIN',
    label: 'Support Admin',
    description: 'Customer-facing support: organizations, users, conversations, leads and tickets.',
    permissions: [
      'organizations.read', 'users.read', 'users.write',
      'conversations.read', 'conversations.write',
      'leads.read', 'leads.write',
      'support.read', 'support.write',
      'docs.read', 'notifications.read',
    ],
  },
  {
    name: 'BILLING_ADMIN',
    label: 'Billing Admin',
    description: 'Subscriptions, payments, invoices and usage.',
    permissions: [
      'organizations.read', 'users.read', 'plans.read',
      'billing.read', 'billing.write',
      'subscriptions.read', 'subscriptions.write',
      'payments.read', 'payments.write',
      'invoices.read', 'invoices.write',
      'usage.read',
    ],
  },
  {
    name: 'CONTENT_ADMIN',
    label: 'Content Admin',
    description: 'Documentation, announcements and feature descriptions.',
    permissions: ['docs.read', 'docs.write', 'announcements.read', 'announcements.write', 'features.read'],
  },
  {
    name: 'ANALYTICS_ADMIN',
    label: 'Analytics Admin',
    description: 'Read-only access to usage, system and audit data for reporting.',
    permissions: [
      'organizations.read', 'users.read', 'conversations.read', 'leads.read',
      'billing.read', 'subscriptions.read', 'payments.read', 'invoices.read',
      'usage.read', 'system.read', 'audit.read',
    ],
  },
];

const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = Object.fromEntries(
  ROLE_DEFINITIONS.map((role) => [role.name, role.permissions]),
) as Record<RoleName, Permission[]>;

export function resolvePermissions(roles: RoleName[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) set.add(permission);
  }
  return Array.from(set);
}

export function hasPermission(granted: Permission[], required?: Permission): boolean {
  if (!required) return true;
  return granted.includes(required);
}

export function hasAnyPermission(granted: Permission[], required: Permission[]): boolean {
  if (required.length === 0) return true;
  return required.some((permission) => granted.includes(permission));
}

export function hasAllPermissions(granted: Permission[], required: Permission[]): boolean {
  return required.every((permission) => granted.includes(permission));
}
