import type { LimitKey, LimitValue, UsageSnapshot } from './entitlements';

/**
 * A quota is a resolved limit paired with what's been consumed against it.
 *
 * `limit` stays a `LimitValue`, so unlimited is explicit in the model — a quota is never "unlimited" because its
 * number happens to be large, and `999999999` means exactly 999,999,999.
 */

export type QuotaPeriod = 'monthly' | 'daily' | 'per_conversation' | 'per_organization';

export const QUOTA_PERIOD_LABEL: Record<QuotaPeriod, string> = {
  monthly: 'Monthly',
  daily: 'Daily',
  per_conversation: 'Per conversation',
  per_organization: 'Per organization',
};

export type QuotaStatusLevel = 'normal' | 'warning' | 'critical' | 'exceeded';

export interface Quota {
  resource: LimitKey;
  label: string;
  period: QuotaPeriod;
  limit: LimitValue;
  used: number;
  /** Null when the quota is unlimited — there is nothing left to count down. */
  remaining: number | null;
  percentage: number | null;
  status: QuotaStatusLevel;
  unlimited: boolean;
  disabled: boolean;
}

/** One organization's usage, as the platform-wide usage endpoint returns it. */
export interface OrganizationUsageRow {
  organizationId: string;
  organizationName: string;
  planId: string;
  usage: UsageSnapshot;
}

export type LimitAlertThreshold = 50 | 75 | 90 | 100;

/**
 * A crossed usage threshold. The Admin computes and displays these; delivering them (email, in-app, webhook) is
 * backend work — the browser is not a notification system.
 */
export interface LimitAlert {
  organizationId: string;
  organizationName: string;
  resource: LimitKey;
  label: string;
  threshold: LimitAlertThreshold;
  status: QuotaStatusLevel;
  percentage: number;
}
