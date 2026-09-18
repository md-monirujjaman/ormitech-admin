import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCatalog } from '@/features/catalog/hooks';
import { usePlans } from '@/features/plans/hooks';
import type { FeatureCategory } from '@/types/catalog';

const CATEGORY_LABEL: Record<FeatureCategory, string> = {
  channels: 'Channels',
  ai: 'AI',
  engagement: 'Engagement',
  platform: 'Platform',
  branding: 'Branding',
};

/**
 * The feature catalog and which plans include each feature.
 *
 * The catalog itself is owned by ormitech-api — features are data, not UI constants. Turning a feature on or
 * off happens either on a plan (Plans) or for a single tenant (an organization's Features tab).
 */
export default function FeaturesPage() {
  const { catalog, isLoading, isError } = useCatalog();
  const plansQuery = usePlans();
  const plans = plansQuery.data ?? [];

  if (isLoading || plansQuery.isLoading) return <LoadingState label="Loading features…" />;
  if (isError || plansQuery.isError) return <ErrorState title="Couldn't load the feature catalog" onRetry={() => plansQuery.refetch()} />;

  const categories = [...new Set(catalog.features.map((feature) => feature.category))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Features"
        description="Every capability the platform can grant. Plans set the defaults; organizations can override individually."
      />

      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{CATEGORY_LABEL[category] ?? category}</CardTitle>
            <CardDescription>{catalog.features.filter((feature) => feature.category === category).length} features</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Requires</TableHead>
                  <TableHead>Included in plans</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.features
                  .filter((feature) => feature.category === category)
                  .map((feature) => {
                    const includedIn = plans.filter((plan) => plan.features[feature.key]);
                    return (
                      <TableRow key={feature.key}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{feature.name}</span>
                            {feature.beta && <Badge variant="warning">Beta</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{feature.key}</code>
                        </TableCell>
                        <TableCell>
                          {feature.dependsOn?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {feature.dependsOn.map((dependency) => (
                                <Badge key={dependency} variant="outline" className="font-normal">
                                  {catalog.features.find((candidate) => candidate.key === dependency)?.name ?? dependency}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {includedIn.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No plans</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {includedIn.map((plan) => (
                                <Badge key={plan.id} variant="secondary" className="font-normal">
                                  {plan.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
