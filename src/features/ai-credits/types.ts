/** The shapes `ormitech-api` answers with for AI credits (`/admin/organizations/:id/ai-credits`, `/admin/ai/credit-policy`). Credit amounts are decimal strings and stay strings. */

export type CreditMode = 'off' | 'observe' | 'enforce';
export type CreditSource = 'plan_included' | 'purchased' | 'admin_grant';

export interface CreditBucket {
  id: string;
  source: CreditSource;
  label: string | null;
  expiresAt: string | null;
  expired: boolean;
  balance: string;
  reserved: string;
  available: string;
  createdAt: string;
}

export interface WalletSummary {
  available: string;
  reserved: string;
  expiredUnswept: string;
  bySource: Array<{ source: CreditSource; balance: string; reserved: string; available: string }>;
  buckets: CreditBucket[];
}

export interface Mismatch {
  organizationId: string;
  bucketId: string;
  check: string;
  stored: string;
  expected: string;
}

export interface CreditsOverview {
  mode: { workspace: CreditMode | null; platform: CreditMode; effective: CreditMode; enforceAllowed: boolean };
  wallet: WalletSummary;
  reconciliation: { ok: boolean; mismatches: Mismatch[] };
  hasReservations: boolean;
}

export interface LedgerEntry {
  id: string;
  bucketId: string;
  entryType: string;
  deltaBalance: string;
  deltaReserved: string;
  balanceAfter: string;
  reservedAfter: string;
  reservationId: string | null;
  usageCostId: string | null;
  reversesId: string | null;
  actorType: string;
  actorId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface UsageCost {
  id: string;
  usageRecordId: string;
  kind: string | null;
  provider: string;
  model: string;
  endpoint: string | null;
  status: 'final' | 'estimated' | 'unpriced' | 'no_usage' | 'failed';
  reason: string | null;
  tokens: { input: string | null; output: string | null; cached: string | null };
  /** The prices that were in force when the call was made. */
  pricing: { priceHistoryId: string | null; inputPerMillion: string | null; outputPerMillion: string | null; cachedInputPerMillion: string | null; currency: string | null };
  cost: string | null;
  conversion: { creditsPerCostUnit: string; markupPercent: string | null; rounding: string | null } | null;
  credits: string | null;
  creditsState: 'none' | 'shadow' | 'charged';
  calculatedAt: string;
  finalizedAt: string | null;
}

export interface Reservation {
  id: string;
  status: 'held' | 'finalized' | 'released' | 'expired';
  kind: string | null;
  conversationId: string | null;
  messageId: string | null;
  estimatedCredits: string;
  chargedCredits: string | null;
  shortfallCredits: string;
  expiresAt: string;
  settledAt: string | null;
  releaseReason: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CreditPolicy {
  mode: CreditMode;
  creditsPerCostUnit: string | null;
  costCurrency: string | null;
  markupPercent: string | null;
  rounding: 'half_up' | 'up' | 'down';
  estimateCharsPerToken: string;
  reservationTtlSeconds: number;
  conversionDecided: boolean;
  updatedAt: string;
  updatedBy: string | null;
  recovery: RecoveryStatus;
}

/** What one recovery pass did, and what it left unfinished. */
export interface RecoveryResult {
  startedAt: string;
  finishedAt: string;
  organizations: number;
  failedOrganizations: number;
  holdsReleased: number;
  holdsSettled: number;
  lateCharges: number;
  snapshotsMade: number;
  creditsCharged: string;
  creditsShortfall: string;
  remaining: { expiredHolds: number; heldWithUsage: number; unpaidUsage: number; uncostedUsage: number; total: number };
}

export interface RecoveryStatus {
  /** Whether the API runs the sweep by itself (AI_CREDIT_RECOVERY_ENABLED). */
  scheduled: boolean;
  lastRunAt: string | null;
  lastResult: RecoveryResult | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  /** Enforce mode can be switched on only when this is true. */
  enforceAllowed: boolean;
}

export interface UpdatePolicyInput {
  mode?: CreditMode;
  creditsPerCostUnit?: string | null;
  costCurrency?: string | null;
  markupPercent?: string | null;
  rounding?: 'half_up' | 'up' | 'down';
  estimateCharsPerToken?: string;
  reservationTtlSeconds?: number;
}

export interface GrantInput {
  source: 'plan_included' | 'admin_grant';
  amount: string;
  label?: string;
  expiresAt?: string;
  reason: string;
  idempotencyKey: string;
}

export interface AdjustInput {
  bucketId: string;
  amount: string;
  reason: string;
  idempotencyKey: string;
}

export interface ReverseInput {
  ledgerEntryId: string;
  reason: string;
  idempotencyKey: string;
}

export interface LedgerResult {
  bucketId: string;
  ledgerId: string;
  replay: boolean;
  idempotencyKey: string;
}
