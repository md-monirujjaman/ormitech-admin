/**
 * The shapes `ormitech-api` answers with for the credit system's settings, pilot allowlist, workspace limits, dashboard and operations
 * (`/admin/ai/credit-settings`, `/admin/ai/credit-dashboard`, `/admin/ai/credit-operations`). Money and credit amounts are decimal strings and
 * stay strings; a `null` is "Not available" (never zero).
 */
import type { CreditMode } from '@/features/ai-credits/types';

export type { CreditMode };
export type RoundingMode = 'ceil' | 'floor' | 'half_up' | 'half_even';

export interface FinancialValues {
  creditValueUsd: string | null;
  markupPercentage: string | null;
  roundingMode: RoundingMode | null;
  decimalPlaces: number | null;
}

export interface ReadinessCheck {
  key: 'financial_settings' | 'cost_unit_verified' | 'recovery_confirmed' | 'pilot_restricted';
  required: boolean;
  ok: boolean;
  detail: string;
}

export interface CreditSettings {
  /** Bumped by every save; a save names the version it read. */
  version: number;
  financial: FinancialValues & { complete: boolean; missing: string[] };
  costUnit: { unit: string | null; usdFactor: string | null; verifiedAt: string | null; verifiedBy: string | null; evidence: string | null; verified: boolean };
  mode: { platform: CreditMode; explanation: Record<CreditMode, string>; recoveryConfirmed: boolean };
  pilot: { restricted: boolean; workspaces: number; max: number };
  enforceReadiness: { ready: boolean; checks: ReadinessCheck[] };
  legacyConversion: {
    decided: boolean;
    creditsPerCostUnit: string | null;
    costCurrency: string | null;
    markupPercent: string | null;
    rounding: string;
    consistency: { status: 'not_comparable' | 'consistent' | 'different'; detail: string };
  };
  observedCostUnits: string[];
  bounds: { markupMax: string; decimalPlaces: { min: number; max: number }; roundingModes: RoundingMode[] };
  updatedAt: string;
  updatedBy: string | null;
}

export interface FinancialInput {
  expectedVersion: number;
  creditValueUsd: string | null;
  markupPercentage: string | null;
  roundingMode: RoundingMode | null;
  decimalPlaces: number | null;
}

export interface CostUnitInput {
  expectedVersion: number;
  unit: string | null;
  usdFactor: string | null;
  evidence: string | null;
}

export interface Preview {
  verifiedCostUsd: string;
  markedCostUsd: string;
  creditsUnrounded: string;
  credits: string;
  settings: FinancialValues & { version: number };
  note: string;
}

export interface PilotWorkspace {
  organizationId: string;
  name: string;
  slug: string;
  addedBy: string;
  addedAt: string;
  note: string | null;
}

export interface WorkspaceLimits {
  organizationId: string;
  name: string;
  slug: string;
  budgetUsd: string | null;
  maxSpendUsd: string | null;
  monthlyLimitUsd: string | null;
  dailyLimitUsd: string | null;
  perTurnLimitUsd: string | null;
  version: number;
  updatedBy: string;
  updatedAt: string;
  /** What the workspace has used in verified USD; null (Not available) until the cost unit is verified. */
  spend: { today: string; month: string; total: string } | null;
}

export interface LimitsList {
  enforced: false;
  note: string;
  spendAvailable: boolean;
  items: WorkspaceLimits[];
}

export type LimitFields = Pick<WorkspaceLimits, 'budgetUsd' | 'maxSpendUsd' | 'monthlyLimitUsd' | 'dailyLimitUsd' | 'perTurnLimitUsd'>;
export interface LimitsInput extends LimitFields {
  expectedVersion: number | null;
}

export type OperationStatus = 'reserved' | 'settled' | 'released' | 'pending_reconciliation' | 'failed' | 'unknown_cost' | 'recorded';

export interface Filters {
  from?: string;
  to?: string;
  organizationId?: string;
  kind?: string;
  model?: string;
  status?: OperationStatus;
}

export interface DashboardBreakdown {
  name: string | null;
  requests: number;
  pendingReconciliation: number;
  failed: number;
  verifiedUsd: string | null;
  unverifiedCost: string | null;
}

export interface Dashboard {
  period: { from: string; to: string };
  filters: { organizationId: string | null; kind: string | null; model: string | null; status: OperationStatus | null };
  statusDefinitions: Record<OperationStatus, string>;
  costUnit: { verified: boolean; unit: string | null; usdFactor: string | null };
  requests: { total: number; failed: number; turns: number; byStatus: Record<OperationStatus, number> };
  cost: {
    verifiedUsd: string | null;
    settledUsd: string | null;
    verifiedRequests: number | null;
    unverified: Array<{ unit: string | null; cost: string | null; requests: number }>;
    pendingReconciliation: number;
    failedRequests: number;
    unknown: number;
  };
  wallet: {
    issued: string;
    adjustmentsNet: string;
    expired: string;
    consumed: string;
    debits: number;
    outstandingBalance: string;
    reservedNow: string;
    reservedNowCount: number;
    reservations: { byStatus: Record<string, { count: number; estimated: string; charged: string }>; settledCredits: string; releasedCredits: string };
  };
  workspaces: {
    truncated: boolean;
    items: Array<{
      organizationId: string;
      name: string;
      slug: string;
      requests: number;
      turns: number;
      failed: number;
      pendingReconciliation: number;
      unknownCost: number;
      verifiedUsd: string | null;
      unverifiedCost: string | null;
      creditsConsumed: string;
      balance: string;
      reserved: string;
    }>;
  };
  byKind: DashboardBreakdown[];
  byModel: DashboardBreakdown[];
  notes: { walletFilters: string; outstandingIsNow: string };
}

export interface Operation {
  id: string;
  source: 'usage' | 'failure';
  organizationId: string;
  organizationName: string | null;
  turnId: string | null;
  attemptId: string | null;
  generationId: string | null;
  kind: string | null;
  model: string | null;
  modelRole: string | null;
  status: OperationStatus;
  costVerification: 'verified_usd' | 'unit_unverified' | 'pending_reconciliation' | 'unknown';
  providerCost: string | null;
  providerCostUnit: string | null;
  costReason: string | null;
  verifiedUsd: string | null;
  reservationId: string | null;
  reservationStatus: string | null;
  reservedCredits: string | null;
  settledCredits: string | null;
  releasedCredits: string | null;
  createdAt: string;
}

export interface OperationsPage {
  costUnit: { verified: boolean; unit: string | null };
  items: Operation[];
  nextCursor: string | null;
}

export interface TurnDetail {
  turnId: string;
  organizationId: string | null;
  attempts: number;
  failedAttempts: number;
  verifiedAttempts: number;
  unresolvedAttempts: number;
  verifiedUsd: string | null;
  items: Operation[];
}
