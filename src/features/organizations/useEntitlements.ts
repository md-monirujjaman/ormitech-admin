import { useMemo } from 'react';
import { useCatalog, type Catalog } from '@/features/catalog/hooks';
import { usePlans } from '@/features/plans/hooks';
import { resolveEntitlements } from '@/lib/entitlements';
import type { Organization } from '@/types/organization';
import type { Plan } from '@/types/plan';
import type { ResolvedEntitlements } from '@/types/entitlements';

/**
 * Everything a screen needs to answer "what is this tenant entitled to": the catalogs, the plan it's on, and
 * the resolved plan+override result. One hook so no screen re-implements the merge.
 */
export function useOrganizationEntitlements(organization: Organization | null | undefined): {
  catalog: Catalog;
  plans: Plan[];
  plan: Plan | undefined;
  resolved: ResolvedEntitlements;
  isLoading: boolean;
} {
  const { catalog, isLoading: catalogLoading } = useCatalog();
  const plansQuery = usePlans();
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const plan = plans.find((candidate) => candidate.id === organization?.planId);

  const resolved = useMemo(
    () => resolveEntitlements(plan, organization?.overrides ?? { features: {}, channels: {}, limits: {} }, catalog),
    [plan, organization?.overrides, catalog],
  );

  return { catalog, plans, plan, resolved, isLoading: catalogLoading || plansQuery.isLoading };
}
