import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { DASHBOARD_STATS, SYSTEM_STATUSES } from '@/lib/mockDashboardData';

export default function Overview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Platform overview</h2>
          <p className="text-sm text-muted-foreground">Snapshot across every OrmiTech organization and system.</p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          Mock data — Phase 1
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DASHBOARD_STATS.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organizations growth</CardTitle>
            <CardDescription>New and cumulative organizations, last 8 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationsGrowthChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages volume</CardTitle>
            <CardDescription>Messages processed across all channels, last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <MessagesVolumeChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI usage</CardTitle>
            <CardDescription>AI-handled conversations, last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <AiUsageChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription distribution</CardTitle>
            <CardDescription>Active subscriptions by plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionDistributionChart />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API usage</CardTitle>
          <CardDescription>Requests across the platform, by hour (UTC).</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiUsageChart />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest events across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System status</CardTitle>
            <CardDescription>Live service health — see System Health for details.</CardDescription>
          </CardHeader>
          <CardContent>
            <SystemStatusGrid statuses={SYSTEM_STATUSES} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
