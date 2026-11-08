export type SupportStatus = 'waiting_for_moderator' | 'assigned' | 'ai_troubleshooting' | 'human_active' | 'waiting_for_customer' | 'resolved' | 'closed';
export type SupportScope = 'available' | 'mine' | 'active' | 'waiting' | 'resolved' | 'all';

export const SUPPORT_PERMISSIONS = ['support.view', 'support.accept', 'support.reply', 'support.manage_assigned', 'support.ai.toggle', 'support.notes.create', 'support.resolve', 'support.reopen', 'support.history.view'] as const;
export type SupportPermission = (typeof SUPPORT_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<SupportPermission, string> = {
  'support.view': 'See requests',
  'support.accept': 'Accept requests',
  'support.reply': 'Reply to clients',
  'support.manage_assigned': 'Change status of their requests',
  'support.ai.toggle': 'Turn the AI on or off',
  'support.notes.create': 'Add internal notes',
  'support.resolve': 'Resolve requests',
  'support.reopen': 'Reopen requests',
  'support.history.view': 'See other moderators’ requests and history',
};

export interface SupportMe {
  isSuperAdmin: boolean;
  isModerator: boolean;
  permissions: SupportPermission[];
}

export interface SupportOverview {
  totalRequests: number;
  pendingRequests: number;
  activeSessions: number;
  waitingForCustomer: number;
  assignedSessions: number;
  resolvedSessions: number;
  averageResponseSeconds: number | null;
}

export interface SessionListItem {
  id: string;
  subject: string;
  category: string;
  categoryLabel: string;
  status: SupportStatus;
  organizationName: string;
  descriptionPreview: string;
  hasAttachment: boolean;
  assignedModeratorId: string | null;
  assignedModeratorName: string | null;
  assignedToMe: boolean;
  canAccept: boolean;
  aiEnabled: boolean;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface SessionList {
  items: SessionListItem[];
  hasMore: boolean;
}

export interface SupportMessage {
  id: string;
  senderType: 'client' | 'ai' | 'moderator' | 'system';
  senderName: string | null;
  body: string;
  attachment: { id: string; fileName: string; mimeType: string; sizeBytes: number } | null;
  createdAt: string;
}

export interface SessionDetail {
  session: Omit<SessionListItem, 'descriptionPreview' | 'hasAttachment'> & {
    description: string;
    phoneNumber: string;
    clientName: string | null;
    aiChangedAt: string | null;
    acceptedAt: string | null;
    firstModeratorReplyAt: string | null;
    resolvedAt: string | null;
    canReply: boolean;
  };
  messages: SupportMessage[];
  notes: Array<{ id: string; adminId: string | null; adminName: string | null; body: string; createdAt: string }>;
  events: Array<{ id: string; actorType: string; actorId: string | null; eventType: string; fromStatus: string | null; toStatus: string | null; detail: string | null; createdAt: string }>;
}

export interface SupportNotifications {
  unread: number;
  items: Array<{ id: string; sessionId: string; kind: string; read: boolean; createdAt: string; subject: string; category: string; categoryLabel: string; status: SupportStatus }>;
}

export interface Moderator {
  id: string;
  email: string;
  name: string;
  active: boolean;
  permissions: SupportPermission[];
  lastLoginAt: string | null;
  createdAt: string;
  openSessions: number;
  resolvedSessions: number;
  averageFirstReplySeconds: number | null;
}

export interface ModeratorActivity {
  events: Array<{ id: string; sessionId: string; eventType: string; fromStatus: string | null; toStatus: string | null; createdAt: string }>;
  assigned: Array<{ id: string; subject: string; status: SupportStatus; createdAt: string }>;
}

export interface CreateModeratorInput {
  email: string;
  name: string;
  password: string;
  permissions?: SupportPermission[];
}
