import { Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { apiErrorMessage } from '@/lib/apiError';
import { canonical, isDecimal, isZero, places } from '../decimal';
import { useCreditSettings, useSaveHold } from '../hooks';
import { Notice, Problem, type NoticeState } from './shared';

/**
 * The fixed credit hold made before every AI call. It is a reservation, never a charge: the customer turn is billed at its verified actual cost and the
 * unused part of the hold goes back. A workspace whose free credit is below the hold cannot start an AI call. Empty means not decided, and the grey text
 * is an example, never a value.
 */
export function HoldCard({ canWrite, onDirtyChange }: { canWrite: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const query = useCreditSettings();
  const save = useSaveHold();
  const [value, setValue] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | undefined>();
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const loadedVersion = useRef<number | null>(null);
  const settings = query.data;
  const savedValue = settings?.hold.turnHoldCredits ?? '';

  const dirty = Boolean(settings && value !== null && canonical(value.trim() || null) !== canonical(savedValue || null));
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    if (!settings) return;
    if (loadedVersion.current === null || (!dirty && loadedVersion.current !== settings.version)) {
      setValue(settings.hold.turnHoldCredits ?? '');
      loadedVersion.current = settings.version;
    }
  }, [settings, dirty]);

  if (query.isError) return <LoadFailed error={query.error} what="the credit settings" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !settings || value === null) return <Skeleton className="h-40 w-full" />;

  const review = () => {
    const text = value.trim();
    if (text !== '' && (!isDecimal(text) || isZero(text) || places(text) > 8)) return setProblem('Enter a positive number of credits with up to 8 decimal places, or leave it empty for not decided');
    setProblem(undefined);
    setConfirm(true);
  };

  const apply = () =>
    save.mutate(
      { expectedVersion: settings.version, turnHoldCredits: value.trim() === '' ? null : value.trim() },
      {
        onSuccess: () => {
          setConfirm(false);
          setNotice({ tone: 'success', message: 'Fixed hold saved.' });
        },
        onError: (error) => {
          setConfirm(false);
          setNotice({ tone: 'error', message: apiErrorMessage(error, 'The hold could not be saved.') });
        },
      },
    );

  return (
    <>
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4" aria-hidden /> Fixed hold per AI call
          </CardTitle>
          <CardDescription>
            Credits held before every AI call. It is a reservation only: the turn is charged its verified actual cost and the unused hold is released. A workspace whose free credit is below this amount cannot start an AI call; its customers are handed to a person. Choose it above the cost of the largest single call you accept. Nothing is assumed: empty means not decided, and enforce cannot be turned on until it is.
          </CardDescription>
          <Badge variant={settings.hold.turnHoldCredits === null ? 'warning' : 'success'} className="w-fit">
            {settings.hold.turnHoldCredits === null ? 'Not decided' : `${settings.hold.turnHoldCredits} credits`}
          </Badge>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              save.reset();
              review();
            }}
          >
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="hold-credits">Hold (credits)</Label>
              <Input id="hold-credits" value={value} placeholder="e.g. 500" disabled={!canWrite} autoComplete="off" inputMode="decimal" onChange={(event) => setValue(event.target.value)} />
              <Problem>{problem}</Problem>
            </div>
            {canWrite && (
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={save.isPending || !dirty}>
                  Review change
                </Button>
                {dirty && <span className="text-xs text-warning">Unsaved changes</span>}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirm}
        onOpenChange={(open) => !open && setConfirm(false)}
        title="Save the fixed hold?"
        description={value.trim() === '' ? 'The hold will be cleared: not decided.' : `${value.trim()} credits will be held before every AI call. The turn is still charged only its verified actual cost.`}
        confirmLabel="Save"
        onConfirm={apply}
        isPending={save.isPending}
      />
    </>
  );
}
