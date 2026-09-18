import { QuotaStatusBadge } from '@/components/shared/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { formatLimit } from '@/lib/entitlements';
import { QUOTA_THRESHOLDS } from '@/lib/quotas';
import { cn } from '@/lib/utils';
import { QUOTA_PERIOD_LABEL, type Quota } from '@/types/quota';

/**
 * Quota rows with their threshold markers (50 / 75 / 90 / 100%), so an admin can see how close a tenant is to
 * the point where a future backend would start refusing work.
 */
export function QuotaList({ quotas, showPeriod = true }: { quotas: Quota[]; showPeriod?: boolean }) {
  return (
    <div className="space-y-5">
      {quotas.map((quota) => (
        <QuotaRow key={quota.resource} quota={quota} showPeriod={showPeriod} />
      ))}
    </div>
  );
}

export function QuotaRow({ quota, showPeriod = true }: { quota: Quota; showPeriod?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{quota.label}</p>
          {showPeriod && <span className="text-xs text-muted-foreground">{QUOTA_PERIOD_LABEL[quota.period]}</span>}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{quota.used.toLocaleString()}</span>
            {' / '}
            {formatLimit(quota.limit)}
          </p>
          <QuotaStatusBadge status={quota.status} />
        </div>
      </div>

      {quota.unlimited ? (
        <div className="h-1.5 rounded-full bg-muted" aria-hidden />
      ) : (
        <div className="relative">
          <Progress
            value={quota.percentage ?? 0}
            indicatorClassName={cn(
              quota.status === 'exceeded' && 'bg-destructive',
              quota.status === 'critical' && 'bg-destructive',
              quota.status === 'warning' && 'bg-warning',
            )}
          />
          {/* Threshold ticks sit on top of the bar rather than in the legend, so the reading is immediate. */}
          {!quota.disabled &&
            QUOTA_THRESHOLDS.filter((threshold) => threshold < 100).map((threshold) => (
              <span
                key={threshold}
                className="absolute top-0 h-1.5 w-px bg-background/80"
                style={{ left: `${threshold}%` }}
                aria-hidden
              />
            ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {quota.unlimited
          ? 'Unlimited — no cap enforced'
          : quota.disabled
            ? 'Not available on this plan'
            : `${quota.remaining?.toLocaleString() ?? 0} remaining · ${quota.percentage ?? 0}% used`}
      </p>
    </div>
  );
}
