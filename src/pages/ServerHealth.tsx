import { MonitoringPanel } from '@/features/monitoring/MonitoringPanel';

/** System health: Redis, the background queues and the job outbox, from the API. */
export default function ServerHealth() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">System health</h2>
        <p className="text-sm text-muted-foreground">Whether background work is running: Redis, every queue and the job outbox.</p>
      </div>
      <MonitoringPanel />
    </div>
  );
}
