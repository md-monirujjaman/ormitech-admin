import { CheckCircle2, CircleAlert, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { score, type Check } from '../seo';

const ICON = {
  pass: <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Good" />,
  warn: <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-label="Could be better" />,
  fail: <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Needs work" />,
};

/** A score and the list of checks behind it, worst first. Advice only: nothing here blocks saving or publishing. */
export function ChecklistCard({ title, description, checks }: { title: string; description: string; checks: Check[] }) {
  const value = score(checks);
  const tone = value >= 80 ? 'text-success' : value >= 50 ? 'text-warning' : 'text-destructive';
  const order = { fail: 0, warn: 1, pass: 2 } as const;
  const sorted = [...checks].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={cn('shrink-0 text-right', tone)} aria-label={`Score ${value} out of 100`}>
          <div className="text-2xl font-semibold leading-none tabular-nums">{value}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">of 100</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn('h-full rounded-full transition-all', value >= 80 ? 'bg-success' : value >= 50 ? 'bg-warning' : 'bg-destructive')} style={{ width: `${value}%` }} />
      </div>
      <ul className="mt-3 space-y-2">
        {sorted.map((check) => (
          <li key={check.id} className="flex gap-2 text-sm">
            {ICON[check.status]}
            <span>
              {check.label}
              {check.hint && check.status !== 'pass' && <span className="block text-xs text-muted-foreground">{check.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
