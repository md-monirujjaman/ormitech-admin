import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/apiError';
import { useClearAllowance, usePlanAllowance, useSetAllowance } from '../hooks';

const CREDITS = /^\d{1,16}(\.\d{1,8})?$/;

/**
 * The AI credits a plan includes in each billing period, and when they expire. Undecided until an administrator decides:
 * nothing is granted and nothing is assumed. Credit reaches a workspace only when it is allocated to a subscription period
 * (through the existing wallet and ledger); changing the allowance never rewrites credit already granted.
 */
export function PlanAllowanceSection({ planId, canWrite }: { planId: string; canWrite: boolean }) {
  const query = usePlanAllowance(planId);
  const save = useSetAllowance(planId);
  const clear = useClearAllowance(planId);
  const [credits, setCredits] = useState('');
  const [days, setDays] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!query.data) return;
    setCredits(query.data.credits === null ? '' : query.data.credits.replace(/\.?0+$/, ''));
    setDays(query.data.expiresAfterDays === null ? '' : String(query.data.expiresAfterDays));
  }, [query.data]);

  if (query.isError) return <p role="alert" className="text-sm text-destructive">{apiErrorMessage(query.error, 'The AI credit allowance could not be loaded.')}</p>;
  if (query.isLoading || !query.data) return <Skeleton className="h-24 w-full" />;
  const allowance = query.data;

  const submit = () => {
    if (!CREDITS.test(credits)) return setProblem('Enter the credits as a number with up to 8 decimals (0 means none included).');
    if (days !== '' && !(Number.isInteger(Number(days)) && Number(days) >= 1 && Number(days) <= 3650)) return setProblem('Expiry is a whole number of days between 1 and 3650, or empty for no expiry.');
    setProblem('');
    save.mutate({ credits, expiresAfterDays: days === '' ? null : Number(days) });
  };

  return (
    <section aria-label="AI credits included" className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">AI credits included</p>
          <p className="text-xs text-muted-foreground">Granted to each subscription period of this plan. Credits only: nothing here shows a provider cost.</p>
        </div>
        <Badge variant={allowance.decided ? 'success' : 'outline'}>{allowance.decided ? 'Decided' : 'Not decided'}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="allowance-credits">Credits per period</Label>
          <Input id="allowance-credits" value={credits} disabled={!canWrite} inputMode="decimal" autoComplete="off" onChange={(event) => setCredits(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="allowance-days">Expire after (days)</Label>
          <Input id="allowance-days" value={days} disabled={!canWrite} inputMode="numeric" autoComplete="off" onChange={(event) => setDays(event.target.value)} />
          <p className="text-xs text-muted-foreground">Counted from the start of the period. Empty: they do not expire.</p>
        </div>
      </div>
      {(problem || save.error || clear.error) && (
        <p role="alert" className="text-xs text-destructive">
          {problem || apiErrorMessage(save.error ?? clear.error, 'The allowance could not be saved.')}
        </p>
      )}
      {save.isSuccess && !problem && <p role="status" className="text-xs text-success">Saved.</p>}
      {canWrite && (
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={save.isPending || clear.isPending} onClick={submit}>
            {save.isPending ? 'Saving…' : 'Save allowance'}
          </Button>
          {allowance.decided && (
            <Button type="button" size="sm" variant="outline" disabled={save.isPending || clear.isPending} onClick={() => clear.mutate()}>
              Stop including credits
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
