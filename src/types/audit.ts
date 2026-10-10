/**
 * The administrator audit trail, as `GET /admin/audit-logs` returns it.
 *
 * `action` and `detail` are two halves of one stored column: the API writes `"<action>: <detail>"` into
 * `admin_access_log.reason` and splits it apart again on the way out, so a caller can filter on the action
 * without matching against free text.
 */
export interface AuditLogEntry {
  id: string;
  adminId: string | null;
  adminEmail: string | null;
  organizationId: string | null;
  action: string;
  detail: string | null;
  operation: 'select' | 'insert' | 'update' | 'delete' | string;
  tableName: string;
  rowId: string | null;
  result: 'success' | 'denied' | 'error' | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/**
 * Everything the endpoint accepts. There is no sort parameter: the trail is always newest first, because a
 * log read in any other order is a log nobody can follow.
 *
 * `action` is a prefix match server-side, so `organization.` finds every action on an organization and
 * `plan.created` finds one. `to` is exclusive.
 */
export interface AuditLogQuery {
  adminId?: string;
  organizationId?: string;
  action?: string;
  result?: 'success' | 'denied' | 'error';
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

/** The action families the trail records, for the filter. Prefixes, matching how the endpoint filters. */
export const AUDIT_ACTION_GROUPS: { label: string; value: string }[] = [
  { label: 'Administrators', value: 'admin.' },
  { label: 'Authorization refusals', value: 'authorization.' },
  { label: 'Organizations', value: 'organization.' },
  { label: 'Organizations (lists)', value: 'organizations.' },
  { label: 'Plans', value: 'plan.' },
  { label: 'Plans (lists)', value: 'plans.' },
  { label: 'Catalogue', value: 'catalog.' },
  { label: 'Leads', value: 'lead.' },
  { label: 'Leads (lists)', value: 'leads.' },
  { label: 'Conversations', value: 'conversation.' },
  { label: 'Conversations (lists)', value: 'conversations.' },
  { label: 'Usage', value: 'usage.' },
  { label: 'Subscriptions', value: 'subscription.' },
  { label: 'Subscriptions (lists)', value: 'subscriptions.' },
  { label: 'Invoices', value: 'invoice.' },
  { label: 'Invoices (lists)', value: 'invoices.' },
  { label: 'Payments', value: 'payments.' },
  { label: 'Billing', value: 'billing.' },
  { label: 'Audit trail reads', value: 'audit_log.' },
];
