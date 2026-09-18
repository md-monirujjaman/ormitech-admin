import { useState } from 'react';
import { ArrowLeft, Ban, CheckCircle2, Pencil, Repeat } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { TenantStatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizationFormDialog } from '@/features/organizations/components/OrganizationFormDialog';
import { PlanChangeDialog } from '@/features/organizations/components/PlanChangeDialog';
import { ActivityTab } from '@/features/organizations/components/tabs/ActivityTab';
import { AiTab } from '@/features/organizations/components/tabs/AiTab';
import { BillingTab } from '@/features/organizations/components/tabs/BillingTab';
import { ChannelsTab } from '@/features/organizations/components/tabs/ChannelsTab';
import { FeaturesTab } from '@/features/organizations/components/tabs/FeaturesTab';
import { OverviewTab } from '@/features/organizations/components/tabs/OverviewTab';
import { PlanTab } from '@/features/organizations/components/tabs/PlanTab';
import { UsageTab } from '@/features/organizations/components/tabs/UsageTab';
import { UsersTab } from '@/features/organizations/components/tabs/UsersTab';
import {
  useAssignPlan,
  useOrganization,
  useOrganizationUsage,
  useSetOrganizationStatus,
  useUpdateAiConfiguration,
  useUpdateOrganization,
  useUpdateOverrides,
} from '@/features/organizations/hooks';
import { useOrganizationEntitlements } from '@/features/organizations/useEntitlements';
import { usePermissions } from '@/hooks/usePermissions';
import { ROUTES } from '@/lib/constants';
import type { AiConfiguration } from '@/types/ai';
import type { EntitlementOverrides, LimitKey, LimitValue } from '@/types/entitlements';
import { TENANT_STATUSES, type TenantStatus } from '@/types/organization';

const TABS = ['overview', 'users', 'plan', 'features', 'channels', 'ai', 'usage', 'billing', 'activity'] as const;

export default function OrganizationDetailPage() {
  const { organizationId = '' } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const canWriteOrganizations = can('organizations.write');
  const canWriteFeatures = can('features.write');
  const canWriteChannels = can('channels.write');
  const canWriteAi = can('ai.write');

  const organizationQuery = useOrganization(organizationId);
  const usageQuery = useOrganizationUsage(organizationId);
  const organization = organizationQuery.data ?? null;
  const { catalog, plans, plan, resolved, isLoading: entitlementsLoading } = useOrganizationEntitlements(organization);

  const updateOrganization = useUpdateOrganization(organizationId);
  const setStatus = useSetOrganizationStatus(organizationId);
  const assignPlan = useAssignPlan(organizationId);
  const updateOverrides = useUpdateOverrides(organizationId);
  const updateAi = useUpdateAiConfiguration(organizationId);

  const [editOpen, setEditOpen] = useState(false);
  const [planChangeOpen, setPlanChangeOpen] = useState(false);
  const [statusChange, setStatusChange] = useState<TenantStatus | null>(null);

  if (organizationQuery.isLoading || entitlementsLoading) {
    return <LoadingState label="Loading organization…" />;
  }

  if (organizationQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load this organization"
        description="The request failed. Retry, or go back to the organizations list."
        onRetry={() => organizationQuery.refetch()}
      />
    );
  }

  if (!organization) {
    return (
      <EmptyState
        title="Organization not found"
        description="This organization may have been removed, or the link is out of date."
        action={
          <Button variant="outline" asChild>
            <Link to={ROUTES.organizations}>Back to organizations</Link>
          </Button>
        }
      />
    );
  }

  /** Writes the whole override object back, with the single change described for the audit draft. */
  function applyOverrides(next: EntitlementOverrides, changed: { kind: 'feature' | 'channel' | 'limit'; key: string; enabled?: boolean }) {
    updateOverrides.mutate({ overrides: next, changed });
  }

  function toggleOverride(kind: 'feature' | 'channel', key: string, enabled: boolean) {
    if (!organization) return;
    const group = kind === 'feature' ? 'features' : 'channels';
    const next: EntitlementOverrides = {
      ...organization.overrides,
      [group]: { ...organization.overrides[group], [key]: enabled },
    };
    applyOverrides(next, { kind, key, enabled });
  }

  function resetOverride(kind: 'feature' | 'channel' | 'limit', key: string) {
    if (!organization) return;
    const group = kind === 'feature' ? 'features' : kind === 'channel' ? 'channels' : 'limits';
    const groupOverrides = { ...organization.overrides[group] } as Record<string, unknown>;
    delete groupOverrides[key];
    const next = { ...organization.overrides, [group]: groupOverrides } as EntitlementOverrides;
    applyOverrides(next, { kind, key });
  }

  function setLimitOverride(key: LimitKey, value: LimitValue) {
    if (!organization) return;
    const next: EntitlementOverrides = {
      ...organization.overrides,
      limits: { ...organization.overrides.limits, [key]: value },
    };
    applyOverrides(next, { kind: 'limit', key });
  }

  function saveAi(configuration: AiConfiguration) {
    updateAi.mutate(configuration);
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground" asChild>
          <Link to={ROUTES.organizations}>
            <ArrowLeft className="size-3.5" aria-hidden />
            All organizations
          </Link>
        </Button>

        <PageHeader
          title={organization.name}
          description={`${organization.ownerName} · ${organization.ownerEmail}`}
          actions={
            <>
              <TenantStatusBadge status={organization.status} />
              {canWriteOrganizations && (
                <>
                  <Select value={organization.status} onValueChange={(value) => setStatusChange(value as TenantStatus)}>
                    <SelectTrigger className="w-36" aria-label="Change status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TENANT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setPlanChangeOpen(true)}>
                    <Repeat className="size-4" aria-hidden />
                    Change plan
                  </Button>
                  <Button variant="outline" onClick={() => setEditOpen(true)}>
                    <Pencil className="size-4" aria-hidden />
                    Edit
                  </Button>
                  {organization.status === 'SUSPENDED' ? (
                    <Button onClick={() => setStatusChange('ACTIVE')}>
                      <CheckCircle2 className="size-4" aria-hidden />
                      Activate
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={() => setStatusChange('SUSPENDED')}>
                      <Ban className="size-4" aria-hidden />
                      Suspend
                    </Button>
                  )}
                </>
              )}
            </>
          }
        />
      </div>

      <Tabs defaultValue={TABS[0]}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab organization={organization} plan={plan} resolved={resolved} catalog={catalog} usage={usageQuery.data} />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab organizationId={organization.id} canWrite={can('users.write')} />
        </TabsContent>

        <TabsContent value="plan">
          <PlanTab
            organization={organization}
            plan={plan}
            catalog={catalog}
            resolved={resolved}
            canWrite={canWriteOrganizations}
            onChangePlan={() => setPlanChangeOpen(true)}
          />
        </TabsContent>

        <TabsContent value="features">
          <FeaturesTab
            catalog={catalog}
            resolved={resolved}
            canWrite={canWriteFeatures}
            isPending={updateOverrides.isPending}
            onToggle={(key, enabled) => toggleOverride('feature', key, enabled)}
            onReset={(key) => resetOverride('feature', key)}
          />
        </TabsContent>

        <TabsContent value="channels">
          <ChannelsTab
            organization={organization}
            plan={plan}
            catalog={catalog}
            resolved={resolved}
            canWrite={canWriteChannels}
            isPending={updateOverrides.isPending}
            onToggle={(key, enabled) => toggleOverride('channel', key, enabled)}
            onReset={(key) => resetOverride('channel', key)}
          />
        </TabsContent>

        <TabsContent value="ai">
          <AiTab
            organization={organization}
            resolved={resolved}
            canWrite={canWriteAi}
            isPending={updateAi.isPending}
            onSave={saveAi}
          />
        </TabsContent>

        <TabsContent value="usage">
          <UsageTab
            usage={usageQuery.data}
            isLoading={usageQuery.isLoading}
            resolved={resolved}
            catalog={catalog}
            canWrite={canWriteOrganizations}
            isPending={updateOverrides.isPending}
            onLimitChange={setLimitOverride}
            onLimitReset={(key) => resetOverride('limit', key)}
          />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTab organization={organization} plan={plan} catalog={catalog} resolved={resolved} usage={usageQuery.data} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab organization={organization} />
        </TabsContent>
      </Tabs>

      <OrganizationFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        organization={organization}
        plans={plans}
        isPending={updateOrganization.isPending}
        error={updateOrganization.error}
        onSubmit={(values) => updateOrganization.mutate(values, { onSuccess: () => setEditOpen(false) })}
      />

      <PlanChangeDialog
        open={planChangeOpen}
        onOpenChange={setPlanChangeOpen}
        organization={organization}
        currentPlan={plan}
        plans={plans}
        catalog={catalog}
        isPending={assignPlan.isPending}
        onConfirm={(planId) => assignPlan.mutate(planId, { onSuccess: () => setPlanChangeOpen(false) })}
      />

      {statusChange && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setStatusChange(null)}
          title={`Change status to ${statusChange.charAt(0) + statusChange.slice(1).toLowerCase()}`}
          description={
            statusChange === 'SUSPENDED'
              ? `${organization.name} will lose access to every channel and its users will not be able to sign in until it is reactivated.`
              : statusChange === 'CANCELLED'
                ? `${organization.name} will be treated as cancelled. Its data is retained, but the tenant loses platform access.`
                : `${organization.name} will have access according to its current plan and entitlements.`
          }
          confirmLabel="Change status"
          destructive={statusChange === 'SUSPENDED' || statusChange === 'CANCELLED'}
          isPending={setStatus.isPending}
          onConfirm={() => setStatus.mutate(statusChange, { onSuccess: () => setStatusChange(null) })}
        />
      )}

      {/* Navigating away after a delete would go here; deletion isn't part of this phase. */}
      <span hidden aria-hidden onClick={() => navigate(ROUTES.organizations)} />
    </div>
  );
}
