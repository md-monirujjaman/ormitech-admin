import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardStat } from '@/types/admin';

const DIRECTION_ICON = { up: ArrowUp, down: ArrowDown, flat: ArrowRight } as const;

export function StatCard({ stat }: { stat: DashboardStat }) {
  const DirectionIcon = stat.change ? DIRECTION_ICON[stat.change.direction] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{stat.label}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between pt-0">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{stat.value}</p>
        {stat.change && DirectionIcon && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              stat.change.direction === 'up' && 'text-success',
              stat.change.direction === 'down' && 'text-destructive',
              stat.change.direction === 'flat' && 'text-muted-foreground',
            )}
          >
            <DirectionIcon className="size-3" aria-hidden />
            {stat.change.value}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
