import { TenantStatusBadge } from '@/components/shared/StatusBadge';
import { UsageBar } from '@/components/shared/UsageBar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Catalog } from '@/features/catalog/hooks';
import { computeUsageMetric } from '@/lib/entitlements';
import type { ResolvedEntitlements, UsageSnapshot } from '@/types/entitlements';
import type { Organization } from '@/types/organization';
import type { Plan } from '@/types/plan';

function formatDateTime(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function OverviewTab({
  organization,
  plan,
  resolved,
  catalog,
  usage,
}: {
  organization: Organization;
  plan: Plan | undefined;
  resolved: ResolvedEntitlements;
  catalog: Catalog;
  usage: UsageSnapshot | undefined;
}) {
  const enabledChannels = catalog.channels.filter((definition) => resolved.channels[definition.key]?.enabled);
  const enabledFeatures = catalog.features.filter((definition) => resolved.features[definition.key]?.enabled);
  const overrideCount =
    Object.keys(organization.overrides.features).length +
    Object.keys(organization.overrides.channels).length +
    Object.keys(organization.overrides.limits).length;

  const headlineLimits = catalog.limits.filter((definition) =>
    ['monthly_messages', 'ai_conversations', 'leads', 'agents'].includes(definition.key),
  );

  const details: { label: string; value: React.ReactNode }[] = [
    { label: 'Organization name', value: organization.name },
    { label: 'Organization ID', value: <span className="font-mono text-xs">{organization.id}</span> },
    { label: 'Owner', value: organization.ownerName },
    { label: 'Email', value: organization.ownerEmail },
    { label: 'Status', value: <TenantStatusBadge status={organization.status} /> },
    { label: 'Current plan', value: plan?.name ?? 'None' },
    { label: 'Created', value: formatDateTime(organization.createdAt) },
    { label: 'Last activity', value: formatDateTime(organization.lastActivityAt) },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border">
            {details.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                <dt className="text-sm text-muted-foreground">{detail.label}</dt>
                <dd className="min-w-0 truncate text-right text-sm text-foreground">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Entitlements</CardTitle>
            <CardDescription>
              {enabledFeatures.length} of {catalog.features.length} features · {enabledChannels.length} of {catalog.channels.length} channels
              {overrideCount > 0 ? ` · ${overrideCount} override${overrideCount === 1 ? '' : 's'}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channels</p>
              {enabledChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No channels enabled.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {enabledChannels.map((definition) => (
                    <Badge key={definition.key} variant="secondary" className="font-normal">
                      {definition.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Features</p>
              {enabledFeatures.length === 0 ? (
                <p className="text-sm text-muted-foreground">No features enabled.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {enabledFeatures.map((definition) => (
                    <Badge
                      key={definition.key}
                      variant={resolved.features[definition.key]?.source === 'override' ? 'outline' : 'secondary'}
                      className="font-normal"
                    >
                      {definition.name}
                      {resolved.features[definition.key]?.source === 'override' && <span className="text-primary">·</span>}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage this period</CardTitle>
            <CardDescription>
              {usage ? `${usage.periodStart} → ${usage.periodEnd}` : 'No usage recorded yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {headlineLimits.map((definition) => (
              <UsageBar
                key={definition.key}
                metric={computeUsageMetric(
                  definition.key,
                  definition.name,
                  usage?.values[definition.key] ?? 0,
                  resolved.limits[definition.key]?.limit ?? { kind: 'disabled' },
                )}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
