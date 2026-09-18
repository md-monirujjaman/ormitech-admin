import { cn } from '@/lib/utils';
import type { ServiceStatusLevel, SystemServiceStatus } from '@/types/admin';

const STATUS_LABEL: Record<ServiceStatusLevel, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
};

const STATUS_DOT: Record<ServiceStatusLevel, string> = {
  operational: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-destructive',
};

const STATUS_TEXT: Record<ServiceStatusLevel, string> = {
  operational: 'text-success',
  degraded: 'text-warning',
  down: 'text-destructive',
};

export function SystemStatusGrid({ statuses }: { statuses: SystemServiceStatus[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {statuses.map((service) => (
        <div key={service.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{service.label}</p>
            {service.message ? (
              <p className="truncate text-xs text-muted-foreground">{service.message}</p>
            ) : service.latencyMs !== undefined ? (
              <p className="text-xs text-muted-foreground">{service.latencyMs}ms</p>
            ) : null}
          </div>
          <span className={cn('flex shrink-0 items-center gap-1.5 text-xs font-medium', STATUS_TEXT[service.status])}>
            <span className={cn('size-1.5 rounded-full', STATUS_DOT[service.status])} aria-hidden />
            {STATUS_LABEL[service.status]}
          </span>
        </div>
      ))}
    </div>
  );
}
