import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SystemStatusGrid } from '@/components/dashboard/SystemStatusGrid';
import { SYSTEM_STATUSES } from '@/lib/mockDashboardData';

export default function ServerHealth() {
  const [checkedAt] = useState(() => new Date());
  const worstStatus = SYSTEM_STATUSES.some((s) => s.status === 'down') ? 'down' : SYSTEM_STATUSES.some((s) => s.status === 'degraded') ? 'degraded' : 'operational';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">System health</h2>
          <p className="text-sm text-muted-foreground">Live status for every OrmiTech platform service.</p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          Mock data — Phase 1
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              {worstStatus === 'operational' ? 'All systems operational' : worstStatus === 'degraded' ? 'Partial degradation' : 'Service disruption'}
            </CardTitle>
            <CardDescription>Last checked {checkedAt.toLocaleTimeString()}</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="size-3.5" aria-hidden />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <SystemStatusGrid statuses={SYSTEM_STATUSES} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Architecture</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            This page renders <code className="rounded bg-muted px-1 py-0.5 text-xs">SYSTEM_STATUSES</code> mock data
            (<code className="rounded bg-muted px-1 py-0.5 text-xs">lib/mockDashboardData.ts</code>). It's built against the same
            shape <code className="rounded bg-muted px-1 py-0.5 text-xs">systemApi.health()</code> (<code className="rounded bg-muted px-1 py-0.5 text-xs">api/adminApi.ts</code>)
            already targets, so wiring in a real <code className="rounded bg-muted px-1 py-0.5 text-xs">GET /admin/system/health</code> endpoint later is a data-source swap, not a rewrite.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
