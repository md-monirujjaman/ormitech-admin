import type { LimitValue } from './entitlements';

export type KnowledgeSourceType = 'website' | 'document' | 'faq' | 'manual';
export type KnowledgeSourceStatus = 'pending' | 'ready' | 'failed';

export interface KnowledgeSource {
  id: string;
  type: KnowledgeSourceType;
  label: string;
  status: KnowledgeSourceStatus;
  updatedAt: string;
}

/**
 * Per-organization AI settings.
 *
 * `model`, `systemPrompt` and `knowledgeSources` are configuration placeholders: the admin can record what an
 * organization *should* use, but no AI provider is called from this app — that belongs to a later phase, behind
 * ormitech-api.
 */
export interface AiConfiguration {
  aiEnabled: boolean;
  aiBotEnabled: boolean;
  humanHandoverEnabled: boolean;
  conversationLimit: LimitValue;
  messageLimit: LimitValue;
  model: string | null;
  systemPrompt: string;
  knowledgeSources: KnowledgeSource[];
  updatedAt: string;
}
