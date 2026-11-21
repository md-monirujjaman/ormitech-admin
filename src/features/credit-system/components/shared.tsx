import { CheckCircle2, CircleAlert, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { NOT_AVAILABLE } from '../format';

export type Tone = 'success' | 'warning' | 'error';
export interface NoticeState {
  message: string;
  tone: Tone;
}

const TONE: Record<Tone, { box: string; icon: typeof CheckCircle2 }> = {
  success: { box: 'border-success/40 bg-success/10', icon: CheckCircle2 },
  warning: { box: 'border-warning/40 bg-warning/10', icon: TriangleAlert },
  error: { box: 'border-destructive/40 bg-destructive/10', icon: CircleAlert },
};

/** A saved, refused or failed change, said where the administrator is looking. It stays until dismissed. */
export function Notice({ notice, onDismiss }: { notice: NoticeState | null; onDismiss: () => void }) {
  if (!notice) return null;
  const Icon = TONE[notice.tone].icon;
  return (
    <div role={notice.tone === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-md border p-3 text-sm', TONE[notice.tone].box)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1">{notice.message}</p>
      <button type="button" aria-label="Dismiss" className="text-muted-foreground hover:text-foreground" onClick={onDismiss}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function Problem({ children }: { children?: string | undefined }) {
  return children ? (
    <p role="alert" className="text-xs text-destructive">
      {children}
    </p>
  ) : null;
}

/** One figure. A figure the API could not give reads "Not available", in muted type, so it is never mistaken for zero. */
export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string | undefined }) {
  const missing = value === NOT_AVAILABLE;
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn('break-words text-xl font-semibold tabular-nums', missing && 'text-base font-medium text-muted-foreground')}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
