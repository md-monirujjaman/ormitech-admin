import { useMemo, useState } from 'react';
import { ArrowUpDown, Ban, Building2, CheckCircle2, Eye, MoreHorizontal, Pencil, Plus, Repeat } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { TenantStatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useChannels } from '@/features/catalog/hooks';
import { OrganizationFormDialog } from '@/features/organizations/components/OrganizationFormDialog';
import { PlanChangeDialog } from '@/features/organizations/components/PlanChangeDialog';
import {
  useAssignPlan,
  useCreateOrganization,
  useOrganizations,
  useSetOrganizationStatus,
  useUpdateOrganization,
} from '@/features/organizations/hooks';
import { useOrganizationEntitlements } from '@/features/organizations/useEntitlements';
import { usePermissions } from '@/hooks/usePermissions';
import { formatLimit, resolveEntitlements } from '@/lib/entitlements';
import { ROUTES } from '@/lib/constants';
import type { OrganizationFormValues } from '@/features/organizations/schemas';
import type { Organization, OrganizationListParams, TenantStatus } from '@/types/organization';
import { TENANT_STATUSES } from '@/types/organization';

const PAGE_SIZE = 10;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function OrganizationsPage() {
  const { can } = usePermissions();
  const canWrite = can('organizations.write');
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TenantStatus | 'all'>('all');
  const [planId, setPlanId] = useState<string>('all');
  const [channel, setChannel] = useState<string>('all');
  const [sort, setSort] = useState<NonNullable<OrganizationListParams['sort']>>('createdAt');
  const [direction, setDirection] = useState<NonNullable<OrganizationListParams['direction']>>('desc');
  const [page, setPage] = useState(1);

  const params: OrganizationListParams = { query, status, planId, channel, sort, direction, page, pageSize: PAGE_SIZE };
  const organizationsQuery = useOrganizations(params);
  const channelsQuery = useChannels();
  const { plans, catalog } = useOrganizationEntitlements(undefined);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [planChangeFor, setPlanChangeFor] = useState<Organization | null>(null);
  const [statusChange, setStatusChange] = useState<{ organization: Organization; next: TenantStatus } | null>(null);

  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization(editing?.id ?? '');
  const assignPlan = useAssignPlan(planChangeFor?.id ?? '');
  const setStatusMutation = useSetOrganizationStatus(statusChange?.organization.id ?? '');

  const planName = useMemo(() => new Map(plans.map((plan) => [plan.id, plan.name])), [plans]);

  const resetToFirstPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  function toggleSort(nextSort: NonNullable<OrganizationListParams['sort']>) {
    if (sort === nextSort) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(nextSort);
      setDirection('asc');
    }
    setPage(1);
  }

  function handleCreate(values: OrganizationFormValues) {
    createOrganization.mutate(values, { onSuccess: () => setCreateOpen(false) });
  }

  function handleEdit(values: OrganizationFormValues) {
    updateOrganization.mutate(values, { onSuccess: () => setEditing(null) });
  }

  const data = organizationsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Every tenant on the OrmiTech platform, their plan, entitlements and status."
        actions={
          canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden />
              New organization
            </Button>
          )
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, owner or email…"
            className="w-full sm:max-w-xs"
            aria-label="Search organizations"
          />

          <Select value={status} onValueChange={resetToFirstPage<TenantStatus | 'all'>(setStatus)}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {TENANT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value.charAt(0) + value.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={planId} onValueChange={resetToFirstPage<string>(setPlanId)}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by plan">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={channel} onValueChange={resetToFirstPage<string>(setChannel)}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by channel">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {(channelsQuery.data ?? []).map((definition) => (
                <SelectItem key={definition.key} value={definition.key}>
                  {definition.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {organizationsQuery.isError ? (
          <ErrorState
            className="m-4"
            title="Couldn't load organizations"
            description="The request failed. Retry, or check that the admin data source is reachable."
            onRetry={() => organizationsQuery.refetch()}
          />
        ) : organizationsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : data && data.items.length === 0 ? (
          <EmptyState
            className="m-4 border-0"
            icon={Building2}
            title="No organizations match these filters"
            description="Try a different search term, or clear the status, plan and channel filters."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('name')}>
                      Organization
                      <ArrowUpDown className="size-3" aria-hidden />
                    </button>
                  </TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>
                    <button type="button" className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('userCount')}>
                      Users
                      <ArrowUpDown className="size-3" aria-hidden />
                    </button>
                  </TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>
                    <button type="button" className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('createdAt')}>
                      Created
                      <ArrowUpDown className="size-3" aria-hidden />
                    </button>
                  </TableHead>
                  <TableHead className="w-10 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((organization) => {
                  const plan = plans.find((candidate) => candidate.id === organization.planId);
                  const resolved = resolveEntitlements(plan, organization.overrides, catalog);
                  const enabledChannels = catalog.channels.filter((definition) => resolved.channels[definition.key]?.enabled);
                  const messageLimit = resolved.limits.monthly_messages?.limit ?? { kind: 'disabled' as const };
                  const used = organization.usageSummary?.monthlyMessagesUsed ?? 0;

                  return (
                    <TableRow key={organization.id}>
                      <TableCell>
                        <Link to={`${ROUTES.organizations}/${organization.id}`} className="font-medium text-foreground hover:text-primary">
                          {organization.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{organization.slug}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground">{organization.ownerName}</p>
                        <p className="text-xs text-muted-foreground">{organization.ownerEmail}</p>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{planName.get(organization.planId) ?? '—'}</TableCell>
                      <TableCell>
                        <TenantStatusBadge status={organization.status} />
                      </TableCell>
                      <TableCell>
                        {enabledChannels.length === 0 ? (
                          <span className="text-xs text-muted-foreground">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {enabledChannels.slice(0, 2).map((definition) => (
                              <Badge key={definition.key} variant="secondary" className="font-normal">
                                {definition.name}
                              </Badge>
                            ))}
                            {enabledChannels.length > 2 && (
                              <Badge variant="outline" className="font-normal text-muted-foreground">
                                +{enabledChannels.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{organization.userCount}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {used.toLocaleString()} / {formatLimit(messageLimit)}
                        <span className="block text-[11px]">messages</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(organization.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${organization.name}`}>
                              <MoreHorizontal className="size-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => navigate(`${ROUTES.organizations}/${organization.id}`)}>
                              <Eye className="size-4" aria-hidden />
                              View
                            </DropdownMenuItem>
                            {canWrite && (
                              <>
                                <DropdownMenuItem onSelect={() => setEditing(organization)}>
                                  <Pencil className="size-4" aria-hidden />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setPlanChangeFor(organization)}>
                                  <Repeat className="size-4" aria-hidden />
                                  Change plan
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {organization.status === 'SUSPENDED' ? (
                                  <DropdownMenuItem onSelect={() => setStatusChange({ organization, next: 'ACTIVE' })}>
                                    <CheckCircle2 className="size-4" aria-hidden />
                                    Activate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={() => setStatusChange({ organization, next: 'SUSPENDED' })}
                                  >
                                    <Ban className="size-4" aria-hidden />
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
          </>
        )}
      </Card>

      <OrganizationFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        plans={plans}
        isPending={createOrganization.isPending}
        error={createOrganization.error}
        onSubmit={handleCreate}
      />

      {editing && (
        <OrganizationFormDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          organization={editing}
          plans={plans}
          isPending={updateOrganization.isPending}
          error={updateOrganization.error}
          onSubmit={handleEdit}
        />
      )}

      {planChangeFor && (
        <PlanChangeDialog
          open
          onOpenChange={(open) => !open && setPlanChangeFor(null)}
          organization={planChangeFor}
          currentPlan={plans.find((plan) => plan.id === planChangeFor.planId)}
          plans={plans}
          catalog={catalog}
          isPending={assignPlan.isPending}
          onConfirm={(nextPlanId) => assignPlan.mutate(nextPlanId, { onSuccess: () => setPlanChangeFor(null) })}
        />
      )}

      {statusChange && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setStatusChange(null)}
          title={statusChange.next === 'SUSPENDED' ? 'Suspend organization' : 'Activate organization'}
          description={
            statusChange.next === 'SUSPENDED'
              ? `${statusChange.organization.name} will lose access to every channel and its users will not be able to sign in until it is reactivated.`
              : `${statusChange.organization.name} will regain access according to its current plan and entitlements.`
          }
          confirmLabel={statusChange.next === 'SUSPENDED' ? 'Suspend' : 'Activate'}
          destructive={statusChange.next === 'SUSPENDED'}
          isPending={setStatusMutation.isPending}
          onConfirm={() => setStatusMutation.mutate(statusChange.next, { onSuccess: () => setStatusChange(null) })}
        />
      )}
    </div>
  );
}
