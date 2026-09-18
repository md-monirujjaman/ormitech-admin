import { EntitlementToggleRow } from '@/components/shared/EntitlementToggleRow';
import { ConnectionStatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Catalog } from '@/features/catalog/hooks';
import type { ChannelKey, ResolvedEntitlements } from '@/types/entitlements';
import type { Organization } from '@/types/organization';
import type { Plan } from '@/types/plan';

/**
 * Channel entitlement for one organization, plus the connection status the API reports.
 *
 * Entitlement ("is this tenant allowed to use WhatsApp?") and connection ("has it actually been hooked up?")
 * are deliberately separate: the Admin owns the first, ormitech-api owns the second. Connecting a channel —
 * Meta OAuth, WhatsApp Cloud API — is not performed here.
 */
export function ChannelsTab({
  organization,
  plan,
  catalog,
  resolved,
  canWrite,
  isPending,
  onToggle,
  onReset,
}: {
  organization: Organization;
  plan: Plan | undefined;
  catalog: Catalog;
  resolved: ResolvedEntitlements;
  canWrite: boolean;
  isPending: boolean;
  onToggle: (key: ChannelKey, enabled: boolean) => void;
  onReset: (key: ChannelKey) => void;
}) {
  return (
    <div className="space-y-4">
      {!canWrite && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          You have read-only access to channels. Ask a Super Admin for <code className="text-xs">channels.write</code> to change access.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Channel access</CardTitle>
          <CardDescription>What this organization is entitled to, from its plan and any overrides.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {catalog.channels.map((channel) => {
            const state = resolved.channels[channel.key] ?? { enabled: false, source: 'plan' as const, planValue: false };
            return (
              <EntitlementToggleRow
                key={channel.key}
                name={channel.name}
                description={channel.description}
                resolved={state}
                disabled={!canWrite || isPending || channel.availability === 'coming_soon'}
                onToggle={(enabled) => onToggle(channel.key, enabled)}
                onReset={() => onReset(channel.key)}
                meta={channel.availability === 'coming_soon' ? <Badge variant="outline">Coming soon</Badge> : undefined}
              />
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection status</CardTitle>
          <CardDescription>
            Reported by ormitech-api. Connecting a channel happens in the customer&apos;s dashboard, not here.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Plan access</TableHead>
                <TableHead>Organization access</TableHead>
                <TableHead>Connection</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalog.channels.map((channel) => {
                const state = resolved.channels[channel.key];
                const planAccess = plan?.channels[channel.key] ?? false;
                return (
                  <TableRow key={channel.key}>
                    <TableCell className="font-medium text-foreground">{channel.name}</TableCell>
                    <TableCell>
                      <Badge variant={planAccess ? 'secondary' : 'outline'} className="font-normal">
                        {planAccess ? 'Included' : 'Not included'}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                    <TableCell>
                      <ConnectionStatusBadge status={organization.connections[channel.key] ?? 'not_configured'} />
                    </TableCell>
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
