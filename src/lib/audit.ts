import type { AuditEvent } from '@/types/admin';

/**
 * Every admin action that will need an audit trail, named once so the UI and a future `ormitech-api` audit
 * logger agree on the vocabulary.
 *
 * Nothing in this app writes an audit log. `buildAuditEvent` produces the payload an admin action *would* send;
 * `ipAddress` and `createdAt` are deliberately absent because only the server can assign them truthfully.
 */
export const AUDIT_ACTIONS = {
  organizationCreated: 'organization.created',
  organizationUpdated: 'organization.updated',
  organizationSuspended: 'organization.suspended',
  organizationActivated: 'organization.activated',
  organizationStatusChanged: 'organization.status.changed',

  organizationUserCreated: 'organization.user.created',
  organizationUserUpdated: 'organization.user.updated',
  organizationUserDisabled: 'organization.user.disabled',
  organizationUserEnabled: 'organization.user.enabled',
  organizationUserRoleChanged: 'organization.user.role.changed',

  planCreated: 'plan.created',
  planUpdated: 'plan.updated',
  planAssigned: 'plan.assigned',

  featureEnabled: 'feature.enabled',
  featureDisabled: 'feature.disabled',

  channelEnabled: 'channel.enabled',
  channelDisabled: 'channel.disabled',

  limitsUpdated: 'limits.updated',
  limitUpdated: 'limit.updated',
  quotaUpdated: 'quota.updated',
  aiSettingsUpdated: 'ai.settings.updated',

  planChanged: 'plan.changed',

  subscriptionCreated: 'subscription.created',
  subscriptionUpdated: 'subscription.updated',
  subscriptionPaused: 'subscription.paused',
  subscriptionResumed: 'subscription.resumed',
  subscriptionCancelled: 'subscription.cancelled',

  paymentCreated: 'payment.created',
  paymentUpdated: 'payment.updated',
  paymentRefunded: 'payment.refunded',

  invoiceCreated: 'invoice.created',
  invoiceUpdated: 'invoice.updated',
  invoiceVoided: 'invoice.voided',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditEventDraft = Pick<AuditEvent, 'adminId' | 'action' | 'resource' | 'resourceId' | 'metadata'>;

export function buildAuditEvent(
  adminId: string,
  action: AuditAction,
  resource: string,
  resourceId: string,
  metadata?: Record<string, unknown>,
): AuditEventDraft {
  return { adminId, action, resource, resourceId, metadata };
}

/**
 * Where an audit event would be sent. Today it only surfaces the draft in development so the events each action
 * produces are visible while building; there is no audit endpoint on ormitech-api yet, and the Admin must not
 * be the thing that writes audit history anyway — the server has to record it from the authenticated request.
 */
export function recordAuditEvent(draft: AuditEventDraft): void {
  if (import.meta.env.DEV) {
    console.debug('[audit]', draft.action, draft);
  }
}
