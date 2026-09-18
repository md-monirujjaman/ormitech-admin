import { useState } from 'react';
import { Ban, CreditCard, Eye, MoreHorizontal, Pause, Play, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { SubscriptionStatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSetSubscriptionStatus, useSubscriptions } from '@/features/billing/hooks';
import { SubscriptionDetailDialog } from '@/features/subscriptions/components/SubscriptionDetailDialog';
import { useOrganizations } from '@/features/organizations/hooks';
import { usePlans } from '@/features/plans/hooks';
import { usePermissions } from '@/hooks/usePermissions';
import { formatBillingDate, formatCurrency } from '@/lib/billing';
import { ROUTES } from '@/lib/constants';
import { SUBSCRIPTION_STATUSES, type Subscription, type SubscriptionStatus } from '@/types/billing';

const PAGE_SIZE = 10;

export default function SubscriptionsPage() {
  const { can } = usePermissions();
  const canWrite = can('subscriptions.write');
  const canChangePlan = can('organizations.write');
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus | 'all'>('all');
  const [planId, setPlanId] = useState('all');
  const [page, setPage] = useState(1);

  const subscriptionsQuery = useSubscriptions({ query, status, planId, page, pageSize: PAGE_SIZE });
  const plansQuery = usePlans();
  const organizationsQuery = useOrganizations({ page: 1, pageSize: 200 });
  const setStatusMutation = useSetSubscriptionStatus();

  const [viewing, setViewing] = useState<Subscription | null>(null);
  const [statusChange, setStatusChange] = useState<{ subscription: Subscription; next: SubscriptionStatus } | null>(null);

  const plans = plansQuery.data ?? [];
  const organizations = organizationsQuery.data?.items ?? [];
  const organizationName = (id: string) => organizations.find((organization) => organization.id === id)?.name ?? id;
  const planName = (id: string) => plans.find((plan) => plan.id === id)?.name ?? id;

  const data = subscriptionsQuery.data;

  const statusCopy: Record<string, { title: string; description: (name: string) => string; confirm: string; destructive: boolean }> = {
    PAUSED: {
      title: 'Pause subscription',
      description: (name) => `${name} keeps its data but stops being billed, and service is suspended until the subscription is resumed.`,
      confirm: 'Pause',
      destructive: true,
    },
    ACTIVE: {
      title: 'Resume subscription',
      description: (name) => `${name} returns to active billing on its current plan.`,
      confirm: 'Resume',
      destructive: false,
    },
    CANCELLED: {
      title: 'Cancel subscription',
      description: (name) => `${name} will be cancelled. Billing stops and the organization loses plan entitlements at the end of the period.`,
      confirm: 'Cancel subscription',
      destructive: true,
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="Every billing agreement on the platform and where it sits in its lifecycle." />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search organization…"
            className="w-full sm:max-w-xs"
            aria-label="Search subscriptions"
          />

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as SubscriptionStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {SUBSCRIPTION_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value.charAt(0) + value.slice(1).toLowerCase().replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={planId}
            onValueChange={(value) => {
              setPlanId(value);
              setPage(1);
            }}
          >
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
        </div>

        {subscriptionsQuery.isError ? (
          <ErrorState className="m-4" title="Couldn't load subscriptions" onRetry={() => void subscriptionsQuery.refetch()} />
        ) : subscriptionsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : data && data.items.length === 0 ? (
          <EmptyState className="m-4 border-0" icon={CreditCard} title="No subscriptions match these filters" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing interval</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium text-foreground">{organizationName(subscription.organizationId)}</TableCell>
                    <TableCell className="text-sm text-foreground">{planName(subscription.planId)}</TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={subscription.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {subscription.billingInterval === 'monthly' ? 'Monthly' : 'Yearly'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">
                      {subscription.price === 0 ? 'Custom' : formatCurrency(subscription.price, subscription.currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(subscription.startedAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(subscription.renewalAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(subscription.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${organizationName(subscription.organizationId)}`}>
                            <MoreHorizontal className="size-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setViewing(subscription)}>
                            <Eye className="size-4" aria-hidden />
                            View
                          </DropdownMenuItem>
                          {canChangePlan && (
                            <DropdownMenuItem onSelect={() => navigate(`${ROUTES.organizations}/${subscription.organizationId}`)}>
                              <Repeat className="size-4" aria-hidden />
                              Change plan
                            </DropdownMenuItem>
                          )}
                          {canWrite && (
                            <>
                              <DropdownMenuSeparator />
                              {subscription.status === 'PAUSED' ? (
                                <DropdownMenuItem onSelect={() => setStatusChange({ subscription, next: 'ACTIVE' })}>
                                  <Play className="size-4" aria-hidden />
                                  Resume
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onSelect={() => setStatusChange({ subscription, next: 'PAUSED' })}>
                                  <Pause className="size-4" aria-hidden />
                                  Pause
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setStatusChange({ subscription, next: 'CANCELLED' })}
                              >
                                <Ban className="size-4" aria-hidden />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
          </>
        )}
      </Card>

      {viewing && <SubscriptionDetailDialog subscription={viewing} onOpenChange={(open) => !open && setViewing(null)} />}

      {statusChange && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setStatusChange(null)}
          title={statusCopy[statusChange.next]?.title ?? 'Change subscription status'}
          description={
            statusCopy[statusChange.next]?.description(organizationName(statusChange.subscription.organizationId)) ??
            'This changes the subscription lifecycle state.'
          }
          confirmLabel={statusCopy[statusChange.next]?.confirm ?? 'Confirm'}
          destructive={statusCopy[statusChange.next]?.destructive ?? false}
          isPending={setStatusMutation.isPending}
          onConfirm={() =>
            setStatusMutation.mutate(
              { id: statusChange.subscription.id, status: statusChange.next },
              { onSuccess: () => setStatusChange(null) },
            )
          }
        />
      )}
    </div>
  );
}
