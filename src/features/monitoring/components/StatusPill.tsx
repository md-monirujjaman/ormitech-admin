import { Badge } from '@/components/ui/badge';

export type Tone = 'ok' | 'warn' | 'bad' | 'muted';

const VARIANT = { ok: 'success', warn: 'warning', bad: 'destructive', muted: 'outline' } as const;

export function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge variant={VARIANT[tone]}>{children}</Badge>;
}
