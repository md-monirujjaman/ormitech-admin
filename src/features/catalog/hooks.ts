import { useQuery } from '@tanstack/react-query';
import { dataSource } from '@/api/dataSource';
import { queryKeys } from '@/lib/queryKeys';
import type { ChannelDefinition, FeatureDefinition, LimitDefinition } from '@/types/catalog';

const CATALOG_STALE_TIME = 5 * 60 * 1000;

export function useFeatures() {
  return useQuery({ queryKey: queryKeys.catalog.features, queryFn: () => dataSource.listFeatures(), staleTime: CATALOG_STALE_TIME });
}

export function useChannels() {
  return useQuery({ queryKey: queryKeys.catalog.channels, queryFn: () => dataSource.listChannels(), staleTime: CATALOG_STALE_TIME });
}

export function useLimitDefinitions() {
  return useQuery({ queryKey: queryKeys.catalog.limits, queryFn: () => dataSource.listLimits(), staleTime: CATALOG_STALE_TIME });
}

export interface Catalog {
  features: FeatureDefinition[];
  channels: ChannelDefinition[];
  limits: LimitDefinition[];
}

/**
 * The three catalogs together, in the shape `resolveEntitlements`/`diffEntitlements` expect. Every entitlement
 * screen takes this rather than importing a hardcoded list of features or channels.
 */
export function useCatalog(): { catalog: Catalog; isLoading: boolean; isError: boolean } {
  const features = useFeatures();
  const channels = useChannels();
  const limits = useLimitDefinitions();

  return {
    catalog: {
      features: features.data ?? [],
      channels: channels.data ?? [],
      limits: limits.data ?? [],
    },
    isLoading: features.isLoading || channels.isLoading || limits.isLoading,
    isError: features.isError || channels.isError || limits.isError,
  };
}
