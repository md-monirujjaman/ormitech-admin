import { Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCatalog } from '@/features/catalog/hooks';
import { useOrganizations } from '@/features/organizations/hooks';
import { usePlans } from '@/features/plans/hooks';
import { ROUTES } from '@/lib/constants';
import { formatLimit, resolveEntitlements } from '@/lib/entitlements';

const SUMMARY_PAGE_SIZE = 200;

/**
 * Platform-wide AI configuration overview. Per-organization settings (model, prompt, knowledge sources, limits)
 * live on each organization's AI tab; this page shows where AI stands across tenants.
 *
 * No AI provider is connected from the Admin — model and prompt are configuration recorded for ormitech-api to
 * act on in a later phase.
 */
export default function AiPage() {
  const { catalog, isLoading, isError } = useCatalog();
  const plansQuery = usePlans();
  const organizationsQuery = useOrganizations({ page: 1, pageSize: SUMMARY_PAGE_SIZE });

  if (isLoading || plansQuery.isLoading || organizationsQuery.isLoading) return <LoadingState label="Loading AI configuration…" />;
  if (isError || plansQuery.isError || organizationsQuery.isError) {
    return <ErrorState title="Couldn't load AI configuration" onRetry={() => organizationsQuery.refetch()} />;
  }

  const plans = plansQuery.data ?? [];
  const organizations = organizationsQuery.data?.items ?? [];

  const aiEnabledCount = organizations.filter((organization) => organization.ai.aiEnabled).length;
  const botEnabledCount = organizations.filter((organization) => organization.ai.aiBotEnabled).length;
  const handoverCount = organizations.filter((organization) => organization.ai.humanHandoverEnabled).length;

  const summary = [
    { label: 'AI enabled', value: aiEnabledCount },
    { label: 'AI bot enabled', value: botEnabledCount },
    { label: 'Human handover', value: handoverCount },
    { label: 'Organizations', value: organizations.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Configuration"
        description="How AI is configured across tenants. Model, prompt and knowledge settings are per organization."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle>{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider</CardTitle>
          <CardDescription>
            No AI provider is connected from OrmiTech Admin. Model selection and system prompts recorded here are configuration for
            ormitech-api to act on once AI execution lands in a later phase.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-organization AI</CardTitle>
          <CardDescription>Open an organization to change its AI settings and limits.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Entitled</TableHead>
                <TableHead>AI</TableHead>
                <TableHead>Bot</TableHead>
                <TableHead>Handover</TableHead>
                <TableHead>Conversation limit</TableHead>
                <TableHead>Message limit</TableHead>
                <TableHead>Model</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((organization) => {
                const plan = plans.find((candidate) => candidate.id === organization.planId);
                const resolved = resolveEntitlements(plan, organization.overrides, catalog);
                const entitled = resolved.features.ai_bot?.enabled ?? false;

                return (
                  <TableRow key={organization.id}>
                    <TableCell>
                      <Link to={`${ROUTES.organizations}/${organization.id}`} className="font-medium text-foreground hover:text-primary">
                        {organization.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entitled ? 'success' : 'outline'} className="font-normal">
                        {entitled ? 'AI Bot in plan' : 'Not entitled'}
                      </Badge>
                    </TableCell>
                    <TableCell>{organization.ai.aiEnabled ? <Bot className="size-4 text-success" aria-label="Enabled" /> : <span className="text-xs text-muted-foreground">Off</span>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{organization.ai.aiBotEnabled ? 'On' : 'Off'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{organization.ai.humanHandoverEnabled ? 'On' : 'Off'}</TableCell>
                    <TableCell className="text-sm text-foreground">{formatLimit(organization.ai.conversationLimit)}</TableCell>
                    <TableCell className="text-sm text-foreground">{formatLimit(organization.ai.messageLimit)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{organization.ai.model ?? 'Not set'}</TableCell>
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
