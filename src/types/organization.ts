import type { AiConfiguration } from './ai';
import type { ChannelConnectionStatus } from './catalog';
import type { ChannelKey, EntitlementOverrides } from './entitlements';

export type TenantStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED' | 'PENDING';

export const TENANT_STATUSES: TenantStatus[] = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED', 'PENDING'];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  status: TenantStatus;
  planId: string;
  createdAt: string;
  lastActivityAt: string | null;
  userCount: number;
  /** Sparse per-organization entitlement overrides on top of the plan — see `types/entitlements.ts`. */
  overrides: EntitlementOverrides;
  ai: AiConfiguration;
  /** Whether each channel is actually hooked up, independent of whether the org is *entitled* to it. */
  connections: Partial<Record<ChannelKey, ChannelConnectionStatus>>;
  /**
   * Headline usage the list endpoint returns alongside each organization, so the table can show a usage column
   * without a request per row. Optional — the full breakdown comes from `getUsage`.
   */
  usageSummary?: { monthlyMessagesUsed: number };
}

export interface OrganizationInput {
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  status: TenantStatus;
  planId: string;
}

export type OrganizationUserRole = 'owner' | 'admin' | 'agent' | 'viewer';
export type OrganizationUserStatus = 'active' | 'invited' | 'disabled';

export const ORGANIZATION_USER_ROLES: OrganizationUserRole[] = ['owner', 'admin', 'agent', 'viewer'];

export interface OrganizationUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: OrganizationUserRole;
  status: OrganizationUserStatus;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface OrganizationUserInput {
  name: string;
  email: string;
  role: OrganizationUserRole;
  status: OrganizationUserStatus;
}

export interface OrganizationListParams {
  query?: string;
  status?: TenantStatus | 'all';
  planId?: string | 'all';
  channel?: string | 'all';
  sort?: 'name' | 'createdAt' | 'userCount';
  direction?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
