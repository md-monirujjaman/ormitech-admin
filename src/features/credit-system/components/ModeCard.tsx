import { useEffect, useState } from 'react';
import { CircleCheck, CircleDashed, CircleX } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { MODE_LABEL } from '@/features/ai-credits/format';
import { apiErrorMessage } from '@/lib/apiError';
import { useCreditSettings, useSetMode } from '../hooks';
import type { CreditMode } from '../types';
import { Notice, Problem, type NoticeState } from './shared';

const MODES: CreditMode[] = ['off', 'observe', 'enforce'];

/**
 * The platform credit mode, and what each mode means. Production stays off: nothing on this page switches credits on by itself, a mode
 * other than off needs the conversion to be decided, and enforce is refused by the API until recovery is confirmed, every financial value is
 * set and the cost unit is verified. A workspace can have its own mode (on its credits tab), which wins over this one.
 */
export function ModeCard({ canWrite, onDirtyChange }: { canWrite: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const query = useCreditSettings();
  const save = useSetMode();
  const [mode, setMode] = useState<CreditMode | null>(null);
  const [confirm, setConfirm] = useState<CreditMode | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const settings = query.data;
  const current = settings?.mode.platform ?? null;

  useEffect(() => {
    if (current !== null) setMode(current);
  }, [current]);
  const dirty = mode !== null && current !== null && mode !== current;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  if (query.isError) return <LoadFailed error={query.error} what="the credit mode" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !settings || mode === null) return <Skeleton className="h-64 w-full" />;
  const readiness = settings.enforceReadiness;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit mode</CardTitle>
        <CardDescription>Whether AI requests are counted in credits, and whether a wallet can stop them. Production credit mode is off unless you change it here.</CardDescription>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Current platform mode</span>
          <Badge variant={current === 'off' ? 'secondary' : current === 'observe' ? 'warning' : 'destructive'}>{MODE_LABEL[current!]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <dl className="space-y-3 text-sm">
          {MODES.map((entry) => (
            <div key={entry} className="rounded-md border border-border p-3">
              <dt className="flex items-center gap-2 font-medium">
                {MODE_LABEL[entry]}
                {entry === current && <Badge variant="outline">Active</Badge>}
              </dt>
              <dd className="mt-1 text-muted-foreground">{settings.mode.explanation[entry]}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-2">
          <p className="text-sm font-medium">What enforce needs</p>
          <ul className="space-y-1.5 text-sm" aria-label="Enforce readiness">
            {readiness.checks.map((check) => (
              <li key={check.key} className="flex items-start gap-2">
                {check.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-label="Met" /> : check.required ? <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Not met" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Advice, not met" />}
                <span>
                  {check.detail}
                  {!check.required && !check.ok && <span className="text-muted-foreground"> (advice)</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {canWrite && (
          <div className="space-y-1.5">
            <Label htmlFor="mode-select">Platform mode</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={mode} onValueChange={(value) => setMode(value as CreditMode)}>
                <SelectTrigger id="mode-select" aria-label="Platform mode" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((entry) => (
                    <SelectItem key={entry} value={entry} disabled={entry === 'enforce' && !readiness.ready && current !== 'enforce'}>
                      {MODE_LABEL[entry]}
                      {entry === 'enforce' && !readiness.ready && current !== 'enforce' ? ' (not ready)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" disabled={!dirty || save.isPending} onClick={() => { save.reset(); setConfirm(mode); }}>
                Review change
              </Button>
              {dirty && <span className="text-xs text-warning">Unsaved changes</span>}
            </div>
            <Problem>{mode !== 'off' && !settings.legacyConversion.decided ? 'A mode other than off also needs the credit policy’s conversion (Credit policy tab of the AI gateway page).' : undefined}</Problem>
          </div>
        )}
      </CardContent>

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || save.isPending ? undefined : setConfirm(null))}
          title={confirm === 'enforce' ? 'Enforce credits across the platform?' : `Switch the platform to ${MODE_LABEL[confirm]}?`}
          description={settings.mode.explanation[confirm]}
          confirmLabel={`Switch to ${MODE_LABEL[confirm]}`}
          destructive={confirm === 'enforce'}
          isPending={save.isPending}
          onConfirm={() =>
            save.mutate(confirm, {
              onSuccess: () => {
                setConfirm(null);
                setNotice({ message: `The platform mode is now ${MODE_LABEL[confirm]}.`, tone: 'success' });
              },
            })
          }
        >
          <div className="space-y-1 text-sm">
            <p className="font-mono text-xs">
              mode: {MODE_LABEL[current!]} → {MODE_LABEL[confirm]}
            </p>
            {confirm === 'enforce' && <p className="text-xs text-warning">Every workspace without a mode of its own will be held to its credit. Prefer the pilot restriction and one workspace at a time.</p>}
            {save.error ? <Problem>{apiErrorMessage(save.error, 'The mode could not be changed.')}</Problem> : null}
          </div>
        </ConfirmDialog>
      )}
    </Card>
  );
}
