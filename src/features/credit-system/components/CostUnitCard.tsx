import { ShieldCheck, ShieldQuestion } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { apiErrorMessage } from '@/lib/apiError';
import { canonical } from '../decimal';
import { formatWhen } from '../format';
import { useCreditSettings, useSaveCostUnit } from '../hooks';
import { costUnitSchema, fieldErrors, type CostUnitForm } from '../schemas';
import { Notice, Problem, type NoticeState } from './shared';

/**
 * Whether the provider's cost is in US dollars. OpenRouter reports `usage.cost` in a unit the documentation calls credits, and nothing
 * here assumes that unit is USD: a super administrator records the unit and its USD factor after checking a real response, with a
 * written note of how. Until then no cost counts as USD, no USD figure is shown and nothing can be billed from the provider's cost.
 */
export function CostUnitCard({ canWrite, onDirtyChange }: { canWrite: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const query = useCreditSettings();
  const save = useSaveCostUnit();
  const [values, setValues] = useState<CostUnitForm>({ unit: '', usdFactor: '', evidence: '' });
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ input: CostUnitForm; clearing: boolean } | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const settings = query.data;

  const dirty = values.unit !== '' || values.usdFactor !== '' || values.evidence !== '';
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  if (query.isError) return <LoadFailed error={query.error} what="the cost unit" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !settings) return <Skeleton className="h-64 w-full" />;
  const unit = settings.costUnit;

  const review = () => {
    const parsed = costUnitSchema.safeParse(values);
    if (!parsed.success) return setProblems(fieldErrors(parsed.error));
    if (parsed.data.unit === '') return setProblems({ unit: 'Enter the unit and its USD factor, or use “Clear verification”' });
    setProblems({});
    setConfirm({ input: parsed.data, clearing: false });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider cost unit</CardTitle>
        <CardDescription>
          The provider reports each request’s cost in a unit that is <strong>not assumed to be US dollars</strong>. Record the unit and what one unit is worth in USD only after checking it against a real response. Until then every cost stays “unit not verified”, and USD totals show “Not available”.
        </CardDescription>
        <div>
          {unit.verified ? (
            <Badge variant="success" className="gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden /> Verified: 1 {unit.unit} = {unit.usdFactor} USD
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1.5">
              <ShieldQuestion className="size-3.5" aria-hidden /> Not verified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        {unit.verified && (
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Verified</dt>
            <dd>{formatWhen(unit.verifiedAt)}</dd>
            <dt className="text-muted-foreground">Evidence</dt>
            <dd className="whitespace-pre-wrap break-words">{unit.evidence}</dd>
          </dl>
        )}
        {canWrite && (
          <form
            className="space-y-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              save.reset();
              review();
            }}
          >
            <p className="text-sm font-medium">{unit.verified ? 'Record a new verification' : 'Record the verification'}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="unit-name">Unit the provider reports</Label>
                <Input id="unit-name" list="observed-units" value={values.unit} placeholder="e.g. openrouter_credits" autoComplete="off" onChange={(event) => setValues({ ...values, unit: event.target.value })} />
                <datalist id="observed-units">
                  {settings.observedCostUnits.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                {settings.observedCostUnits.length > 0 && !problems.unit && <p className="text-xs text-muted-foreground">Seen on recorded requests: {settings.observedCostUnits.join(', ')}</p>}
                <Problem>{problems.unit}</Problem>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit-factor">USD per one unit</Label>
                <Input id="unit-factor" value={values.usdFactor} placeholder="e.g. 1" inputMode="decimal" autoComplete="off" onChange={(event) => setValues({ ...values, usdFactor: event.target.value })} />
                <Problem>{problems.usdFactor}</Problem>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit-evidence">How it was verified</Label>
              <Textarea id="unit-evidence" value={values.evidence} placeholder="e.g. compared the cost of one test request with the amount the provider’s dashboard shows for it" rows={3} onChange={(event) => setValues({ ...values, evidence: event.target.value })} />
              <Problem>{problems.evidence}</Problem>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={save.isPending}>
                Review
              </Button>
              {dirty && <span className="text-xs text-warning">Unsaved changes</span>}
              {unit.verified && (
                <Button type="button" variant="outline" className="text-destructive" onClick={() => { save.reset(); setConfirm({ input: { unit: '', usdFactor: '', evidence: '' }, clearing: true }); }}>
                  Clear verification
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || save.isPending ? undefined : setConfirm(null))}
          title={confirm.clearing ? 'Clear the cost unit verification?' : 'Record this verification?'}
          description={
            confirm.clearing
              ? 'USD figures become “Not available” again and no provider cost can be billed until a unit is verified.'
              : 'From now on a cost reported in this unit is treated as USD at this factor, in the dashboard and in the calculation. A wrong factor misstates every figure: record it only if you checked it.'
          }
          confirmLabel={confirm.clearing ? 'Clear verification' : 'Record verification'}
          destructive={confirm.clearing}
          isPending={save.isPending}
          onConfirm={() =>
            save.mutate(
              { expectedVersion: settings.version, unit: confirm.clearing ? null : confirm.input.unit, usdFactor: confirm.clearing ? null : confirm.input.usdFactor, evidence: confirm.clearing ? null : confirm.input.evidence },
              {
                onSuccess: () => {
                  setConfirm(null);
                  setValues({ unit: '', usdFactor: '', evidence: '' });
                  setNotice({ message: confirm.clearing ? 'The verification was cleared.' : 'The verification was recorded.', tone: 'success' });
                },
              },
            )
          }
        >
          <div className="space-y-1 text-sm">
            {!confirm.clearing && (
              <>
                <p className="font-mono text-xs">unit: {unit.unit ?? 'not verified'} → {confirm.input.unit}</p>
                <p className="font-mono text-xs">USD per unit: {unit.usdFactor ?? 'not set'} → {canonical(confirm.input.usdFactor)}</p>
              </>
            )}
            {save.error ? <Problem>{apiErrorMessage(save.error, 'The verification could not be saved.')}</Problem> : null}
          </div>
        </ConfirmDialog>
      )}
    </Card>
  );
}
