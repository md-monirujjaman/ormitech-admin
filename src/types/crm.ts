/**
 * Leads and conversations as `ormitech-api`'s admin endpoints return them.
 *
 * Separate from `types/organization.ts` on purpose: those types were shaped around the fixture source and
 * carry fields no endpoint fills. These are the API's own shapes, field for field, so a screen reading them
 * is reading what the database actually holds.
 */

export interface AdminPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminPage<T> {
  items: T[];
  meta: AdminPageMeta;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'];

export interface AdminLead {
  id: string;
  organizationId: string;
  organizationName: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  status: string;
  assignedAgentName: string | null;
  customerName: string | null;
  conversationChannel: string | null;
  conversationStatus: string | null;
  lastMessagePreview: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminLeadDetail extends AdminLead {
  customer: { id: string; name: string | null; email: string | null; phone: string | null } | null;
  conversation: {
    id: string;
    channel: string;
    status: string;
    mode: string;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    unreadCount: number;
    createdAt: string;
  } | null;
}

export interface AdminLeadListParams {
  search?: string;
  status?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
}

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'archived';

export const CONVERSATION_STATUSES: ConversationStatus[] = ['open', 'pending', 'resolved', 'archived'];

export const CHANNEL_TYPES = ['facebook', 'instagram', 'whatsapp', 'website'] as const;

export interface AdminConversation {
  id: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  channel: string;
  channelName: string | null;
  status: string;
  mode: string;
  priority: string;
  assignedAgentName: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
}

export interface AdminConversationListParams {
  search?: string;
  status?: string;
  channel?: string;
  page?: number;
  limit?: number;
}

export interface AdminMessage {
  id: string;
  senderType: 'customer' | 'ai' | 'agent' | 'system' | string;
  senderName: string | null;
  content: string;
  messageType: string;
  status: string;
  createdAt: string;
}

export interface AdminMemberActivity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown>;
  createdAt: string;
}

export interface AdminMemberSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  expiresAt: string;
  createdAt: string;
}
