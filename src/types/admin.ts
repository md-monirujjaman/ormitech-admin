export type ServiceStatusLevel = 'operational' | 'degraded' | 'down';

export interface SystemServiceStatus {
  id: string;
  label: string;
  status: ServiceStatusLevel;
  latencyMs?: number;
  message?: string;
  checkedAt: string;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  change?: { value: string; direction: 'up' | 'down' | 'flat' };
}

export interface ActivityEvent {
  id: string;
  type: 'organization' | 'subscription' | 'channel' | 'ai' | 'docs' | 'settings';
  title: string;
  description: string;
  createdAt: string;
}

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface AdminNotification {
  id: string;
  title: string;
  description: string;
  severity: NotificationSeverity;
  read: boolean;
  createdAt: string;
}

/**
 * Every write an admin makes anywhere in the platform is expected to produce one of these on ormitech-api.
 * Nothing here writes audit events yet — this is the shape a future `GET /admin/audit-logs` response should
 * match, so the Audit Logs screen can be built against it without a type change later.
 */
export interface AuditEvent {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

export interface SearchResultItem {
  id: string;
  type: 'organization' | 'user' | 'conversation' | 'lead' | 'invoice' | 'documentation';
  title: string;
  subtitle?: string;
  href: string;
}
