export type AgentSlot = 'slot1' | 'slot2' | 'slot3' | 'slot4';

export interface AgentSlotOption {
  role: AgentSlot;
  label: string;
  modelId: string | null;
  ready: boolean;
}

export interface AgentModelStats {
  role: AgentSlot | null;
  modelId: string | null;
  answers: number;
  thumbsDown: number;
}

export interface AgentOverview {
  primaryRole: AgentSlot | null;
  backupRole: AgentSlot | null;
  updatedAt: string | null;
  slots: AgentSlotOption[];
  stats: { days: number; answers: number; thumbsDown: number; thumbsDownPercent: number | null; byModel: AgentModelStats[] };
}

export interface AgentFeedbackItem {
  id: string;
  createdAt: string;
  workspace: string;
  reason: string;
  note: string;
  question: string;
  answer: string;
  modelRole: string | null;
  modelId: string | null;
}

export interface AgentFeedbackPage {
  items: AgentFeedbackItem[];
  next: string | null;
}

export const REASON_LABELS: Record<string, string> = {
  wrong_answer: 'Wrong answer',
  wrong_action: 'Did the wrong thing',
  not_understood: 'Did not understand',
  other: 'Something else',
};
