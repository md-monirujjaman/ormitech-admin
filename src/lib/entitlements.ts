import type { ChannelDefinition, FeatureDefinition, LimitDefinition } from '@/types/catalog';
import type {
  ChannelKey,
  EntitlementDiff,
  EntitlementDiffEntry,
  EntitlementOverrides,
  FeatureKey,
  LimitKey,
  LimitValue,
  ResolvedEntitlements,
  ResolvedLimit,
  ResolvedToggle,
  UsageMetric,
} from '@/types/entitlements';
import type { Plan } from '@/types/plan';

export function createEmptyOverrides(): EntitlementOverrides {
  return { features: {}, channels: {}, limits: {} };
}

export const isUnlimited = (limit: LimitValue) => limit.kind === 'unlimited';
export const isDisabled = (limit: LimitValue) => limit.kind === 'disabled';
export const limitAmount = (limit: LimitValue) => (limit.kind === 'limited' ? limit.value : null);

export function formatLimit(limit: LimitValue): string {
  switch (limit.kind) {
    case 'unlimited':
      return 'Unlimited';
    case 'disabled':
      return 'Disabled';
    case 'limited':
      return limit.value.toLocaleString();
  }
}

export function limitsEqual(a: LimitValue, b: LimitValue): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'limited' && b.kind === 'limited' ? a.value === b.value : true;
}

/**
 * Ranks a limit so a change can be classified as a gain or a loss: disabled < limited(n) < unlimited.
 * `Infinity` for unlimited is deliberate — it makes the comparison total without special-casing every call site.
 */
function limitRank(limit: LimitValue): number {
  switch (limit.kind) {
    case 'disabled':
      return -1;
    case 'limited':
      return limit.value;
    case 'unlimited':
      return Number.POSITIVE_INFINITY;
  }
}

/**
 * The one place plan defaults and organization overrides are merged. Every screen that shows what an
 * organization can do reads the result of this, so "what is this tenant entitled to?" has exactly one answer.
 */
export function resolveEntitlements(
  plan: Plan | undefined,
  overrides: EntitlementOverrides,
  catalog: { features: FeatureDefinition[]; channels: ChannelDefinition[]; limits: LimitDefinition[] },
): ResolvedEntitlements {
  const features: Record<FeatureKey, ResolvedToggle> = {};
  for (const definition of catalog.features) {
    const planValue = plan?.features[definition.key] ?? false;
    const override = overrides.features[definition.key];
    features[definition.key] =
      override === undefined
        ? { enabled: planValue, source: 'plan', planValue }
        : { enabled: override, source: 'override', planValue };
  }

  const channels: Record<ChannelKey, ResolvedToggle> = {};
  for (const definition of catalog.channels) {
    const planValue = plan?.channels[definition.key] ?? false;
    const override = overrides.channels[definition.key];
    channels[definition.key] =
      override === undefined
        ? { enabled: planValue, source: 'plan', planValue }
        : { enabled: override, source: 'override', planValue };
  }

  const limits: Record<LimitKey, ResolvedLimit> = {} as Record<LimitKey, ResolvedLimit>;
  for (const definition of catalog.limits) {
    const planValue = plan?.limits[definition.key] ?? { kind: 'disabled' as const };
    const override = overrides.limits[definition.key];
    limits[definition.key] =
      override === undefined
        ? { limit: planValue, source: 'plan', planValue }
        : { limit: override, source: 'override', planValue };
  }

  return { features, channels, limits };
}

/** Reconciles a raw usage counter against its resolved limit. Unlimited and disabled have no percentage to show. */
export function computeUsageMetric(key: LimitKey, label: string, used: number, limit: LimitValue): UsageMetric {
  if (limit.kind === 'unlimited') {
    return { key, label, used, limit, remaining: null, percentage: null, unlimited: true, disabled: false };
  }
  if (limit.kind === 'disabled') {
    return { key, label, used, limit, remaining: 0, percentage: null, unlimited: false, disabled: true };
  }
  const remaining = Math.max(limit.value - used, 0);
  const percentage = limit.value === 0 ? 100 : Math.min(Math.round((used / limit.value) * 100), 100);
  return { key, label, used, limit, remaining, percentage, unlimited: false, disabled: false };
}

const toggleLabel = (enabled: boolean) => (enabled ? 'Enabled' : 'Disabled');

/**
 * Diffs what an organization currently resolves to against what it would resolve to on a different plan (with
 * the same overrides still applied). Drives the plan-change confirmation dialog: nothing is applied until the
 * admin has seen every feature, channel and limit that would change, and specifically what would be lost.
 */
export function diffEntitlements(
  current: ResolvedEntitlements,
  next: ResolvedEntitlements,
  catalog: { features: FeatureDefinition[]; channels: ChannelDefinition[]; limits: LimitDefinition[] },
): EntitlementDiff {
  const features: EntitlementDiffEntry[] = [];
  for (const definition of catalog.features) {
    const before = current.features[definition.key]?.enabled ?? false;
    const after = next.features[definition.key]?.enabled ?? false;
    if (before === after) continue;
    features.push({
      key: definition.key,
      label: definition.name,
      before: toggleLabel(before),
      after: toggleLabel(after),
      direction: after ? 'gain' : 'loss',
    });
  }

  const channels: EntitlementDiffEntry[] = [];
  for (const definition of catalog.channels) {
    const before = current.channels[definition.key]?.enabled ?? false;
    const after = next.channels[definition.key]?.enabled ?? false;
    if (before === after) continue;
    channels.push({
      key: definition.key,
      label: definition.name,
      before: toggleLabel(before),
      after: toggleLabel(after),
      direction: after ? 'gain' : 'loss',
    });
  }

  const limits: EntitlementDiffEntry[] = [];
  for (const definition of catalog.limits) {
    const before = current.limits[definition.key]?.limit ?? { kind: 'disabled' as const };
    const after = next.limits[definition.key]?.limit ?? { kind: 'disabled' as const };
    if (limitsEqual(before, after)) continue;
    const beforeRank = limitRank(before);
    const afterRank = limitRank(after);
    limits.push({
      key: definition.key,
      label: definition.name,
      before: formatLimit(before),
      after: formatLimit(after),
      direction: afterRank > beforeRank ? 'gain' : afterRank < beforeRank ? 'loss' : 'change',
    });
  }

  const all = [...features, ...channels, ...limits];
  return {
    features,
    channels,
    limits,
    losses: all.filter((entry) => entry.direction === 'loss'),
    hasChanges: all.length > 0,
  };
}
