import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PaymentStatusChart,
  PlanDistributionChart,
  RevenueGrowthChart,
  SubscriptionGrowthChart,
} from '@/features/billing/components/charts';
import { useBillingCharts, useBillingSummary } from '@/features/billing/hooks';
import { formatCurrency } from '@/lib/billing';

export default function BillingOverviewPage() {
  const summaryQuery = useBillingSummary();
  const chartsQuery = useBillingCharts();

  if (summaryQuery.isError || chartsQuery.isError) {
    return <ErrorState title="Couldn't load billing figures" onRetry={() => void summaryQuery.refetch()} />;
  }

  const summary = summaryQuery.data;
  const charts = chartsQuery.data;
  const currency = summary?.currency ?? 'USD';

  const cards = summary
    ? [
        { label: 'Monthly Recurring Revenue', value: formatCurrency(summary.monthlyRecurringRevenue, currency) },
        { label: 'Active Subscriptions', value: summary.activeSubscriptions.toLocaleString() },
        { label: 'Trial Organizations', value: summary.trialOrganizations.toLocaleString() },
        { label: 'Past Due', value: summary.pastDue.toLocaleString() },
        { label: 'Cancelled', value: summary.cancelled.toLocaleString() },
        { label: 'Payments Today', value: summary.paymentsToday.toLocaleString() },
        { label: 'Revenue This Month', value: formatCurrency(summary.revenueThisMonth, currency) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Billing Overview" description="Revenue, subscriptions and payment health across the platform." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryQuery.isLoading
          ? Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)
          : cards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardTitle>{card.label}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">{card.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue growth</CardTitle>
            <CardDescription>Collected payments by month.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartsQuery.isLoading ? <Skeleton className="h-56 w-full" /> : <RevenueGrowthChart data={charts?.revenue ?? []} currency={currency} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription growth</CardTitle>
            <CardDescription>Cumulative subscriptions by month.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartsQuery.isLoading ? <Skeleton className="h-56 w-full" /> : <SubscriptionGrowthChart data={charts?.subscriptionGrowth ?? []} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan distribution</CardTitle>
            <CardDescription>Subscriptions per plan.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartsQuery.isLoading ? <Skeleton className="h-56 w-full" /> : <PlanDistributionChart data={charts?.planDistribution ?? []} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment status distribution</CardTitle>
            <CardDescription>Payment records by outcome.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartsQuery.isLoading ? <Skeleton className="h-56 w-full" /> : <PaymentStatusChart data={charts?.paymentStatus ?? []} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
