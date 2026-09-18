import { computeUsageMetric } from '@/lib/entitlements';
import type { LimitDefinition } from '@/types/catalog';
import type { LimitKey, ResolvedEntitlements, UsageSnapshot } from '@/types/entitlements';
import type { LimitAlert, LimitAlertThreshold, Quota, QuotaPeriod, QuotaStatusLevel } from '@/types/quota';

/** The usage thresholds the Admin surfaces, and a future backend would raise notifications on. */
export const QUOTA_THRESHOLDS: LimitAlertThreshold[] = [50, 75, 90, 100];

export function quotaStatusFor(percentage: number | null, unlimited: boolean, disabled: boolean): QuotaStatusLevel {
  if (unlimited) return 'normal';
  if (disabled) return 'normal';
  if (percentage === null) return 'normal';
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 90) return 'critical';
  if (percentage >= 50) return 'warning';
  return 'normal';
}

export const QUOTA_STATUS_LABEL: Record<QuotaStatusLevel, string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  exceeded: 'Exceeded',
};

/**
 * Maps a limit's catalog period onto the quota vocabulary. `daily` and `per_conversation` exist in the model
 * for quotas ormitech-api may enforce later; nothing is invented for them here.
 */
function periodFor(definition: LimitDefinition): QuotaPeriod {
  return definition.period === 'month' ? 'monthly' : 'per_organization';
}

/**
 * Builds quotas from resolved entitlements plus usage. Deliberately delegates the used/limit/remaining math to
 * `computeUsageMetric` so quota display and usage display can never disagree.
 */
export function buildQuotas(
  limits: LimitDefinition[],
  resolved: ResolvedEntitlements,
  usage: UsageSnapshot | undefined,
): Quota[] {
  return limits.map((definition) => {
    const metric = computeUsageMetric(
      definition.key,
      definition.name,
      usage?.values[definition.key] ?? 0,
      resolved.limits[definition.key]?.limit ?? { kind: 'disabled' },
    );

    return {
      resource: definition.key,
      label: definition.name,
      period: periodFor(definition),
      limit: metric.limit,
      used: metric.used,
      remaining: metric.remaining,
      percentage: metric.percentage,
      status: quotaStatusFor(metric.percentage, metric.unlimited, metric.disabled),
      unlimited: metric.unlimited,
      disabled: metric.disabled,
    };
  });
}

/** The highest threshold a quota has crossed, or null if it hasn't crossed any. */
export function crossedThreshold(percentage: number | null): LimitAlertThreshold | null {
  if (percentage === null) return null;
  let crossed: LimitAlertThreshold | null = null;
  for (const threshold of QUOTA_THRESHOLDS) {
    if (percentage >= threshold) crossed = threshold;
  }
  return crossed;
}

/** One alert per quota that has crossed a threshold. Display only — delivery belongs to ormitech-api. */
export function buildLimitAlerts(organizationId: string, organizationName: string, quotas: Quota[]): LimitAlert[] {
  const alerts: LimitAlert[] = [];

  for (const quota of quotas) {
    if (quota.unlimited || quota.disabled || quota.percentage === null) continue;
    const threshold = crossedThreshold(quota.percentage);
    if (threshold === null) continue;

    alerts.push({
      organizationId,
      organizationName,
      resource: quota.resource as LimitKey,
      label: quota.label,
      threshold,
      status: quota.status,
      percentage: quota.percentage,
    });
  }

  return alerts.sort((a, b) => b.percentage - a.percentage);
}
