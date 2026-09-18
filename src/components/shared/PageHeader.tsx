import type { ReactNode } from 'react';
import { MockDataNotice } from '@/components/shared/MockDataNotice';

export function PageHeader({
  title,
  description,
  actions,
  showMockNotice = true,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  showMockNotice?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {showMockNotice && <MockDataNotice />}
        </div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
