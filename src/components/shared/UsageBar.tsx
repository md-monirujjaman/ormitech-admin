import { Progress } from '@/components/ui/progress';
import { formatLimit } from '@/lib/entitlements';
import { cn } from '@/lib/utils';
import type { UsageMetric } from '@/types/entitlements';

/** One usage row: used, limit, remaining and percentage — with unlimited and disabled rendered honestly. */
export function UsageBar({ metric }: { metric: UsageMetric }) {
  const critical = metric.percentage !== null && metric.percentage >= 90;
  const warning = metric.percentage !== null && metric.percentage >= 75 && !critical;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{metric.label}</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{metric.used.toLocaleString()}</span>
          {' / '}
          {formatLimit(metric.limit)}
        </p>
      </div>

      {metric.unlimited ? (
        <div className="h-1.5 rounded-full bg-muted" aria-hidden />
      ) : (
        <Progress
          value={metric.percentage ?? 0}
          indicatorClassName={cn(critical && 'bg-destructive', warning && 'bg-warning')}
        />
      )}

      <p className="text-xs text-muted-foreground">
        {metric.unlimited
          ? 'Unlimited — no cap enforced'
          : metric.disabled
            ? 'Not available on this plan'
            : `${metric.remaining?.toLocaleString() ?? 0} remaining · ${metric.percentage ?? 0}% used`}
      </p>
    </div>
  );
}
