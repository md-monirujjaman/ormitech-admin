import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { apiErrorMessage } from '@/lib/apiError';
import { formatCredits, formatUsd, formatWhen, NOT_AVAILABLE } from '../format';
import { usePlanBudgets, useRemovePlanBudget, useSavePlanBudget } from '../hooks';
import { fieldErrors, planBudgetSchema } from '../schemas';
import type { PlanBudget } from '../types';
import { Notice, Problem, type NoticeState } from './shared';

const MISSING_LABEL: Record<string, string> = { budget: 'budget', markup: 'markup', creditValueUsd: 'credit value', roundingMode: 'rounding mode', decimalPlaces: 'precision' };
const missingText = (missing: string[]) => `Needs: ${missing.map((key) => MISSING_LABEL[key] ?? key).join(', ')}`;

/** Edits one plan's API budget and markup. The credits they are worth are shown by the API once saved: they are never typed. */
function PlanDialog({ plan, onClose, onSaved }: { plan: PlanBudget | null; onClose: () => void; onSaved: (message: string) => void }) {
  const save = useSavePlanBudget();
  const [values, setValues] = useState({ usdBudget: '', markupPercent: '' });
  const [problems, setProblems] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!plan) return;
    setValues({ usdBudget: plan.usdBudget ?? '', markupPercent: plan.markupPercent ?? '' });
    setProblems({});
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  if (!plan) return null;
  const submit = () => {
    const parsed = planBudgetSchema.safeParse(values);
    if (!parsed.success) return setProblems(fieldErrors(parsed.error));
    setProblems({});
    save.mutate(
      { slug: plan.slug, plan: { expectedVersion: plan.version, usdBudget: parsed.data.usdBudget === '' ? null : parsed.data.usdBudget, markupPercent: parsed.data.markupPercent === '' ? null : parsed.data.markupPercent } },
      { onSuccess: () => onSaved(`${plan.name}: the budget and markup were saved.`) },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => (open || save.isPending ? undefined : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{plan.name} plan</DialogTitle>
          <DialogDescription>The API budget is what the AI may actually cost, in US dollars. The credits it is worth are worked out for you: (budget × (1 + markup ÷ 100)) ÷ credit value. The markup is set here and nowhere else.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="plan-budget">API budget (USD)</Label>
            <Input id="plan-budget" value={values.usdBudget} placeholder="e.g. 10" inputMode="decimal" autoComplete="off" onChange={(event) => setValues({ ...values, usdBudget: event.target.value })} />
            <Problem>{problems.usdBudget}</Problem>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-markup">Markup (percent)</Label>
            <Input id="plan-markup" value={values.markupPercent} placeholder="e.g. 20" inputMode="decimal" autoComplete="off" onChange={(event) => setValues({ ...values, markupPercent: event.target.value })} />
            <p className="text-xs text-muted-foreground">0 means no markup; empty means not decided. At most 10000.</p>
            <Problem>{problems.markupPercent}</Problem>
          </div>
          {save.error ? <Problem>{apiErrorMessage(save.error, 'The plan could not be saved.')}</Problem> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlanConfiguration({ canWrite }: { canWrite: boolean }) {
  const query = usePlanBudgets();
  const remove = useRemovePlanBudget();
  const [editing, setEditing] = useState<PlanBudget | null>(null);
  const [removing, setRemoving] = useState<PlanBudget | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  if (query.isError) return <LoadFailed error={query.error} what="the plan settings" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data) return <Skeleton className="h-56 w-full" />;
  const data = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan configuration</CardTitle>
        <CardDescription>
          Each plan’s API budget in USD and its markup. Credits are derived and are never typed: credits = (budget × (1 + markup ÷ 100)) ÷ credit value, rounded once. The five plans are the existing ones.
        </CardDescription>
        {!data.conversion.ready && <Badge variant="warning">Credits not available: the credit value, rounding mode and precision are not all set (Settings tab)</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>API budget</TableHead>
              <TableHead>Markup</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Changed</TableHead>
              {canWrite && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((plan) => (
              <TableRow key={plan.slug}>
                <TableCell>
                  <p className="font-medium">{plan.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{plan.slug}</p>
                </TableCell>
                <TableCell>{plan.usdBudget === null ? <span className="text-muted-foreground">Not set</span> : formatUsd(plan.usdBudget)}</TableCell>
                <TableCell>{plan.markupPercent === null ? <span className="text-muted-foreground">Not set</span> : `${plan.markupPercent}%`}</TableCell>
                <TableCell>
                  {plan.credits === null ? (
                    <span className="text-xs text-muted-foreground">
                      {NOT_AVAILABLE} · {missingText(plan.missing)}
                    </span>
                  ) : (
                    <span className="tabular-nums">{formatCredits(plan.credits)}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">{formatWhen(plan.updatedAt)}</TableCell>
                {canWrite && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" aria-label={`Edit the ${plan.name} plan`} onClick={() => setEditing(plan)}>
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      {plan.version !== null && (
                        <Button type="button" variant="ghost" size="icon" aria-label={`Remove the settings of the ${plan.name} plan`} onClick={() => { remove.reset(); setRemoving(plan); }}>
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <PlanDialog plan={editing} onClose={() => setEditing(null)} onSaved={(message) => { setEditing(null); setNotice({ message, tone: 'success' }); }} />

      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || remove.isPending ? undefined : setRemoving(null))}
          title={`Remove the ${removing.name} plan’s budget and markup?`}
          description="Workspaces on this plan have no budget or markup from it until they are set again. Credits already granted stay in the wallets."
          confirmLabel="Remove"
          destructive
          isPending={remove.isPending}
          onConfirm={() => remove.mutate(removing.slug, { onSuccess: () => { setRemoving(null); setNotice({ message: 'The plan’s budget and markup were removed.', tone: 'success' }); } })}
        >
          {remove.error ? <Problem>{apiErrorMessage(remove.error, 'The settings could not be removed.')}</Problem> : null}
        </ConfirmDialog>
      )}
    </Card>
  );
}

/** Plan configuration: where each plan's USD budget and markup are set. Credits reach a user by themselves from the plan the user is on (see the Accounts tab). */
export function PlansTab({ canWrite }: { canWrite: boolean }) {
  return (
    <div className="space-y-6">
      <PlanConfiguration canWrite={canWrite} />
    </div>
  );
}
