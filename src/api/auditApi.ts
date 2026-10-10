import { axiosClient } from './axiosClient';
import type { AdminPage } from '@/types/crm';
import type { AuditLogEntry, AuditLogQuery } from '@/types/audit';

/**
 * The administrator audit trail.
 *
 * `super_admin` only, which the API enforces — every other admin endpoint is open to any authenticated
 * administrator and this one is not. The trail is what makes the rest accountable, so an operator who could
 * read which of their actions were logged, and which colleagues looked at what, is a step from working
 * around it. A request without the role comes back 403, and the page says so rather than showing an empty
 * table.
 *
 * Reading the trail is itself recorded, so this endpoint appears in its own output — one request behind,
 * because the entry is written in the same transaction as the read.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const auditApi = {
  list: (params: AuditLogQuery) => unwrap<AdminPage<AuditLogEntry>>(axiosClient.get('/admin/audit-logs', { params })),
};
