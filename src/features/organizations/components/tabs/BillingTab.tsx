import { Link } from 'react-router-dom';
import { FileText, Receipt, Wallet } from 'lucide-react';
import { QuotaList } from '@/components/shared/QuotaList';
import { InvoiceStatusBadge, PaymentStatusBadge, SubscriptionStatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Catalog } from '@/features/catalog/hooks';
import { useInvoices, usePayments, useSubscriptionByOrganization } from '@/features/billing/hooks';
import { formatBillingDate, formatCurrency } from '@/lib/billing';
import { ROUTES } from '@/lib/constants';
import { buildQuotas } from '@/lib/quotas';
import type { ResolvedEntitlements, UsageSnapshot } from '@/types/entitlements';
import type { Organization } from '@/types/organization';
import type { Plan } from '@/types/plan';

/**
 * Everything billing for one tenant: its subscription, what it pays, recent payments and invoices, and how its
 * usage stands against the quotas its plan grants.
 *
 * There is still no billing backend and no payment provider — records shown here are whatever the data source
 * reports, and nothing is charged from the Admin.
 */
export function BillingTab({
  organization,
  plan,
  catalog,
  resolved,
  usage,
}: {
  organization: Organization;
  plan: Plan | undefined;
  catalog: Catalog;
  resolved: ResolvedEntitlements;
  usage: UsageSnapshot | undefined;
}) {
  const subscriptionQuery = useSubscriptionByOrganization(organization.id);
  const paymentsQuery = usePayments({ organizationId: organization.id, page: 1, pageSize: 5 });
  const invoicesQuery = useInvoices({ organizationId: organization.id, page: 1, pageSize: 5 });

  const subscription = subscriptionQuery.data ?? null;
  const quotas = buildQuotas(catalog.limits, resolved, usage);

  const subscriptionRows = [
    { label: 'Plan', value: plan?.name ?? 'None' },
    {
      label: 'Price',
      value: !subscription ? '—' : subscription.price === 0 ? 'Custom pricing' : formatCurrency(subscription.price, subscription.currency),
    },
    { label: 'Billing interval', value: subscription ? (subscription.billingInterval === 'monthly' ? 'Monthly' : 'Yearly') : '—' },
    { label: 'Started', value: formatBillingDate(subscription?.startedAt ?? null) },
    { label: 'Renews', value: formatBillingDate(subscription?.renewalAt ?? null) },
    { label: 'Trial ends', value: formatBillingDate(subscription?.trialEndsAt ?? null) },
    { label: 'Cancelled', value: formatBillingDate(subscription?.cancelledAt ?? null) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>The billing agreement behind this organization&apos;s entitlements.</CardDescription>
            </div>
            {subscription && <SubscriptionStatusBadge status={subscription.status} />}
          </CardHeader>
          <CardContent>
            {subscriptionQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : !subscription ? (
              <EmptyState className="border-0 py-8" title="No subscription" description="This organization has no billing agreement on record." />
            ) : (
              <>
                <dl className="divide-y divide-border">
                  {subscriptionRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                      <dt className="text-sm text-muted-foreground">{row.label}</dt>
                      <dd className="text-sm text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to={ROUTES.subscriptions}>View in Subscriptions</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage & limits</CardTitle>
            <CardDescription>{usage ? `${usage.periodStart} → ${usage.periodEnd}` : 'No usage recorded for this period.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <QuotaList quotas={quotas.slice(0, 5)} showPeriod={false} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>Most recent payment records for this organization.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {paymentsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (paymentsQuery.data?.items ?? []).length === 0 ? (
            <EmptyState className="border-0 py-10" icon={Wallet} title="No payments" description="No payment has been recorded for this tenant." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(paymentsQuery.data?.items ?? []).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(payment.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">{formatCurrency(payment.amount, payment.currency)}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="text-sm capitalize text-muted-foreground">{payment.method.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{payment.transactionReference ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Most recent invoices issued to this organization.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.invoices}>All invoices</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {invoicesQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (invoicesQuery.data?.items ?? []).length === 0 ? (
            <EmptyState className="border-0 py-10" icon={FileText} title="No invoices" description="Nothing has been invoiced to this tenant yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoicesQuery.data?.items ?? []).map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">{invoice.number}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(invoice.issuedAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(invoice.dueAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(invoice.paidAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground">
              <Receipt className="mr-1 size-3" aria-hidden />
              Not integrated
            </Badge>
            <p className="text-sm text-muted-foreground">
              No payment gateway is connected. Charging, refunds and dunning are ormitech-api&apos;s responsibility in a later phase; gateway
              credentials never reach this app.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
