import { useQuery } from '@tanstack/react-query';
import { Activity, BarChart3 } from 'lucide-react';
import { dashboardApi } from '@/api/dashboardApi';
import { RecentActivity } from '@/features/audit-logs/components/RecentActivity';
import { isMockDataSource } from '@/api/dataSource';
import { MockDataNotice } from '@/components/shared/MockDataNotice';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { StatCard } from '@/components/dashboard/StatCard';
import { SystemStatusGrid } from '@/components/dashboard/SystemStatusGrid';
import {
  AiUsageChart,
  ApiUsageChart,
  MessagesVolumeChart,
  OrganizationsGrowthChart,
  SubscriptionDistributionChart,
} from '@/components/dashboard/charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/apiError';
import { DASHBOARD_STATS, SYSTEM_STATUSES } from '@/lib/mockDashboardData';
import { queryKeys } from '@/lib/queryKeys';
import type { DashboardStat } from '@/types/admin';

const COUNT = new Intl.NumberFormat();

/**
 * The platform overview.
 *
 * Against the real API the five counts come from `GET /admin/dashboard/stats`, which counts across every
 * tenant through the platform role. They carry no `change`: a percentage needs a figure from last month and
 * nothing stores one, so showing a trend would mean inventing the comparison.
 *
 * The charts and the two feeds below them are a different matter. Their series — organizations per month,
 * messages per day, AI usage, subscription mix, API requests, recent activity, service health — have no
 * endpoint and no table behind them yet. On the fixture source they render the fixtures, as they always have.
 * Against the API they say there is no history rather than drawing one, because a chart is read as a fact
 * about the business and these would be read as the wrong fact.
 */
export default function Overview() {
  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () => dashboardApi.stats(),
    // The fixture source has its own numbers; this request would 404 against nothing in mock mode.
    enabled: !isMockDataSource,
  });

  const liveStats: DashboardStat[] = statsQuery.data
    ? [
        { id: 'total-organizations', label: 'Total Organizations', value: COUNT.format(statsQuery.data.totalOrganizations) },
        { id: 'active-organizations', label: 'Active Organizations', value: COUNT.format(statsQuery.data.activeOrganizations) },
        { id: 'total-users', label: 'Total Users', value: COUNT.format(statsQuery.data.totalUsers) },
        { id: 'total-conversations', label: 'Conversations', value: COUNT.format(statsQuery.data.totalConversations) },
        { id: 'total-customers', label: 'Customers', value: COUNT.format(statsQuery.data.totalCustomers) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Platform overview</h2>
          <p className="text-sm text-muted-foreground">Snapshot across every OrmiTech organization and system.</p>
        </div>
        <MockDataNotice />
      </div>

      {isMockDataSource ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {DASHBOARD_STATS.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>
      ) : statsQuery.isError ? (
        <ErrorState
          title="Couldn't load platform statistics"
          description={apiErrorMessage(statsQuery.error, 'The OrmiTech API refused the request.')}
          onRetry={() => statsQuery.refetch()}
        />
      ) : statsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {liveStats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organizations growth</CardTitle>
            <CardDescription>New and cumulative organizations, last 8 months.</CardDescription>
          </CardHeader>
          <CardContent>{isMockDataSource ? <OrganizationsGrowthChart /> : <NoHistory />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages volume</CardTitle>
            <CardDescription>Messages processed across all channels, last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>{isMockDataSource ? <MessagesVolumeChart /> : <NoHistory />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI usage</CardTitle>
            <CardDescription>AI-handled conversations, last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>{isMockDataSource ? <AiUsageChart /> : <NoHistory />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription distribution</CardTitle>
            <CardDescription>Active subscriptions by plan.</CardDescription>
          </CardHeader>
          <CardContent>
            {isMockDataSource ? (
              <SubscriptionDistributionChart />
            ) : (
              <NoHistory description="No subscriptions yet. Customer billing is not implemented, so nothing is subscribed." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API usage</CardTitle>
          <CardDescription>Requests across the platform, by hour (UTC).</CardDescription>
        </CardHeader>
        <CardContent>{isMockDataSource ? <ApiUsageChart /> : <NoHistory />}</CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              {isMockDataSource ? 'Latest events across the platform.' : 'What administrators did, newest first.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* The audit trail is the one activity the platform records; nothing stores customer-side events. */}
            {isMockDataSource ? <ActivityFeed /> : <RecentActivity />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System status</CardTitle>
            <CardDescription>Live service health — see System Health for details.</CardDescription>
          </CardHeader>
          <CardContent>
            {isMockDataSource ? (
              <SystemStatusGrid statuses={SYSTEM_STATUSES} />
            ) : (
              <EmptyState
                icon={Activity}
                title="No health endpoint yet"
                description="ormitech-api does not expose service health to the panel."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NoHistory({ description }: { description?: string } = {}) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No historical data yet"
      description={description ?? 'Nothing records this series yet, so there is no history to chart.'}
    />
  );
}
