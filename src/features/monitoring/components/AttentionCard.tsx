import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MonitoringSnapshot } from '@/types/monitoring';
import { AREA_LABEL, attentionText } from '../format';

/** The one-line answer ("is anything wrong?") and, when something is, what and where. */
export function AttentionCard({ snapshot }: { snapshot: MonitoringSnapshot }) {
  const { needsAttention, attention } = snapshot;
  const Icon = needsAttention ? AlertTriangle : CheckCircle2;
  return (
    <Card className={cn(needsAttention ? 'border-warning/50' : 'border-success/40')}>
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', needsAttention ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success')}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold text-foreground">
            {needsAttention ? `${attention.length} ${attention.length === 1 ? 'thing needs' : 'things need'} attention` : 'Nothing needs attention'}
          </CardTitle>
          <CardDescription>
            {needsAttention ? 'Background work may be delayed or at risk. Details below.' : 'Redis, every queue and the outbox look healthy.'}
          </CardDescription>
        </div>
      </CardHeader>
      {needsAttention && (
        <CardContent>
          <ul className="space-y-2" aria-label="Findings">
            {attention.map((item, index) => (
              <li key={`${item.area}-${item.code}-${item.queue ?? ''}-${index}`} className="flex items-start gap-2 text-sm text-foreground">
                <Badge variant="outline" className="mt-0.5 shrink-0">
                  {AREA_LABEL[item.area] ?? item.area}
                </Badge>
                <span>{attentionText(item)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
