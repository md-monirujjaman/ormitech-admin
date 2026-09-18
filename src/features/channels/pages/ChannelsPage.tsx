import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCatalog } from '@/features/catalog/hooks';
import { useOrganizations } from '@/features/organizations/hooks';
import { usePlans } from '@/features/plans/hooks';
import { resolveEntitlements } from '@/lib/entitlements';
import type { ChannelConnectionStatus } from '@/types/catalog';

/** One page of organizations is enough to summarize entitlement across the platform without a request per tenant. */
const SUMMARY_PAGE_SIZE = 200;

const CONNECTION_LABEL: Record<ChannelConnectionStatus, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
  not_configured: 'Not configured',
};

/**
 * Platform-wide channel view: what each channel is, which plans include it, how many organizations are
 * entitled, and how their connections are doing.
 *
 * Connecting a channel (Meta OAuth, WhatsApp Cloud API) is not performed here — that is integration work owned
 * by ormitech-api. The Admin manages entitlement and reports status.
 */
export default function ChannelsPage() {
  const { catalog, isLoading, isError } = useCatalog();
  const plansQuery = usePlans();
  const organizationsQuery = useOrganizations({ page: 1, pageSize: SUMMARY_PAGE_SIZE });

  if (isLoading || plansQuery.isLoading || organizationsQuery.isLoading) return <LoadingState label="Loading channels…" />;
  if (isError || plansQuery.isError || organizationsQuery.isError) {
    return <ErrorState title="Couldn't load channel data" onRetry={() => organizationsQuery.refetch()} />;
  }

  const plans = plansQuery.data ?? [];
  const organizations = organizationsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Channels"
        description="Channel entitlement across the platform. Connections are made by customers; the Admin controls access."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {catalog.channels.map((channel) => {
          const includedInPlans = plans.filter((plan) => plan.channels[channel.key]);
          const entitled = organizations.filter((organization) => {
            const plan = plans.find((candidate) => candidate.id === organization.planId);
            const resolved = resolveEntitlements(plan, organization.overrides, catalog);
            return resolved.channels[channel.key]?.enabled;
          });
          const connectionCounts = entitled.reduce<Record<string, number>>((counts, organization) => {
            const status = organization.connections[channel.key] ?? 'not_configured';
            counts[status] = (counts[status] ?? 0) + 1;
            return counts;
          }, {});

          return (
            <Card key={channel.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold text-foreground">{channel.name}</CardTitle>
                  <Badge variant={channel.availability === 'available' ? 'success' : 'outline'}>
                    {channel.availability === 'available' ? 'Available' : 'Coming soon'}
                  </Badge>
                </div>
                <CardDescription>{channel.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Plan access</p>
                  <div className="flex flex-wrap justify-end gap-1">
                    {includedInPlans.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No plans</span>
                    ) : (
                      includedInPlans.map((plan) => (
                        <Badge key={plan.id} variant="secondary" className="font-normal">
                          {plan.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Organization access</p>
                  <p className="text-sm font-medium text-foreground">
                    {entitled.length} of {organizations.length}
                  </p>
                </div>

                <div className="space-y-1 border-t border-border pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connections</p>
                  {Object.keys(connectionCounts).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No entitled organizations yet.</p>
                  ) : (
                    Object.entries(connectionCounts).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{CONNECTION_LABEL[status as ChannelConnectionStatus] ?? status}</span>
                        <span className="text-xs font-medium text-foreground">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entitlement by organization</CardTitle>
          <CardDescription>Resolved from each organization&apos;s plan and overrides.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                {catalog.channels.map((channel) => (
                  <TableHead key={channel.key}>{channel.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((organization) => {
                const plan = plans.find((candidate) => candidate.id === organization.planId);
                const resolved = resolveEntitlements(plan, organization.overrides, catalog);
                return (
                  <TableRow key={organization.id}>
                    <TableCell className="font-medium text-foreground">{organization.name}</TableCell>
                    {catalog.channels.map((channel) => {
                      const state = resolved.channels[channel.key];
                      return (
                        <TableCell key={channel.key}>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={state?.enabled ? 'success' : 'outline'} className="font-normal">
                              {state?.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                            {state?.source === 'override' && (
                              <Badge variant="outline" className="font-normal text-primary">
                                Override
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
