import { EntitlementToggleRow } from '@/components/shared/EntitlementToggleRow';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Catalog } from '@/features/catalog/hooks';
import type { FeatureCategory } from '@/types/catalog';
import type { FeatureKey, ResolvedEntitlements } from '@/types/entitlements';

const CATEGORY_LABEL: Record<FeatureCategory, string> = {
  channels: 'Channels',
  ai: 'AI',
  engagement: 'Engagement',
  platform: 'Platform',
  branding: 'Branding',
};

/**
 * Per-organization feature entitlements. The rows come from the feature catalog, so a feature added on the API
 * shows up here without a code change — nothing about a specific feature is encoded in this component.
 */
export function FeaturesTab({
  catalog,
  resolved,
  canWrite,
  isPending,
  onToggle,
  onReset,
}: {
  catalog: Catalog;
  resolved: ResolvedEntitlements;
  canWrite: boolean;
  isPending: boolean;
  onToggle: (key: FeatureKey, enabled: boolean) => void;
  onReset: (key: FeatureKey) => void;
}) {
  const categories = [...new Set(catalog.features.map((feature) => feature.category))];

  return (
    <div className="space-y-4">
      {!canWrite && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          You have read-only access to features. Ask a Super Admin for <code className="text-xs">features.write</code> to change entitlements.
        </p>
      )}

      {categories.map((category) => {
        const features = catalog.features.filter((feature) => feature.category === category);

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{CATEGORY_LABEL[category] ?? category}</CardTitle>
              <CardDescription>
                Overrides here apply to this organization only and survive a plan change until you reset them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {features.map((feature) => {
                const state = resolved.features[feature.key] ?? { enabled: false, source: 'plan' as const, planValue: false };
                const unmetDependency = feature.dependsOn?.find((dependency) => !resolved.features[dependency]?.enabled);

                return (
                  <EntitlementToggleRow
                    key={feature.key}
                    name={feature.name}
                    description={feature.description}
                    resolved={state}
                    disabled={!canWrite || isPending}
                    onToggle={(enabled) => onToggle(feature.key, enabled)}
                    onReset={() => onReset(feature.key)}
                    meta={
                      <>
                        {feature.beta && <Badge variant="warning">Beta</Badge>}
                        {state.enabled && unmetDependency && (
                          <Badge variant="destructive">
                            Requires {catalog.features.find((candidate) => candidate.key === unmetDependency)?.name ?? unmetDependency}
                          </Badge>
                        )}
                      </>
                    }
                  />
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
