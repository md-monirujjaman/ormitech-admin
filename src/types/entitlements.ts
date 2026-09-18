/**
 * The central tenant entitlement model.
 *
 * Everything an organization is allowed to do resolves through here: a plan supplies defaults, an
 * organization-level override can change any single one of them, and the resolved result is what the UI renders
 * and what `ormitech-api` will eventually enforce. Nothing in a UI component decides entitlement behaviour —
 * components read a `ResolvedEntitlements` and render it.
 */

/** Feature and channel keys are data-driven (the catalog comes from the API), so they stay plain strings. */
export type FeatureKey = string;
export type ChannelKey = string;

/** Limits are structural — the backend enforces these exact named counters — so this one is a closed union. */
export type LimitKey =
  | 'monthly_messages'
  | 'ai_conversations'
  | 'ai_messages'
  | 'leads'
  | 'orders'
  | 'agents'
  | 'team_members'
  | 'connected_channels';

/**
 * A limit is never a bare number, because "0", "unlimited" and "not available at all" are three different
 * things and a bare number can't tell them apart. `unlimited` is a real state the backend can enforce (no cap
 * check), not a label the UI paints over a large number.
 */
export type LimitValue = { kind: 'disabled' } | { kind: 'limited'; value: number } | { kind: 'unlimited' };

export const DISABLED: LimitValue = { kind: 'disabled' };
export const UNLIMITED: LimitValue = { kind: 'unlimited' };
export const limited = (value: number): LimitValue => ({ kind: 'limited', value });

/** Where a resolved entitlement's value came from — drives the "Overridden" badge in the UI. */
export type EntitlementSource = 'plan' | 'override';

/**
 * Organization-level overrides on top of the assigned plan. Sparse by design: an absent key means "inherit from
 * the plan", which is what makes a later plan change flow through automatically for everything not overridden.
 */
export interface EntitlementOverrides {
  features: Partial<Record<FeatureKey, boolean>>;
  channels: Partial<Record<ChannelKey, boolean>>;
  limits: Partial<Record<LimitKey, LimitValue>>;
}

export interface ResolvedToggle {
  enabled: boolean;
  source: EntitlementSource;
  planValue: boolean;
}

export interface ResolvedLimit {
  limit: LimitValue;
  source: EntitlementSource;
  planValue: LimitValue;
}

export interface ResolvedEntitlements {
  features: Record<FeatureKey, ResolvedToggle>;
  channels: Record<ChannelKey, ResolvedToggle>;
  limits: Record<LimitKey, ResolvedLimit>;
}

/** Raw usage counters for the current billing period, as a future `GET /admin/organizations/:id/usage` returns them. */
export interface UsageSnapshot {
  periodStart: string;
  periodEnd: string;
  values: Partial<Record<LimitKey, number>>;
}

/** A single usage row, already reconciled against its limit — `remaining`/`percentage` are null when unlimited. */
export interface UsageMetric {
  key: LimitKey;
  label: string;
  used: number;
  limit: LimitValue;
  remaining: number | null;
  percentage: number | null;
  unlimited: boolean;
  disabled: boolean;
}

export type EntitlementChangeDirection = 'gain' | 'loss' | 'change';

export interface EntitlementDiffEntry {
  key: string;
  label: string;
  before: string;
  after: string;
  direction: EntitlementChangeDirection;
}

/**
 * What changes if a plan is assigned — shown in the confirmation dialog before anything is applied, so access is
 * never silently removed. `losses` is what a future downgrade-rules engine would gate on.
 */
export interface EntitlementDiff {
  features: EntitlementDiffEntry[];
  channels: EntitlementDiffEntry[];
  limits: EntitlementDiffEntry[];
  losses: EntitlementDiffEntry[];
  hasChanges: boolean;
}
