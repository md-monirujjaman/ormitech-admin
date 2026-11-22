import { Pencil, Search, Trash2 } from 'lucide-react';
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
import { newKey } from '@/features/ai-credits/idempotency';
import { apiErrorMessage } from '@/lib/apiError';
import { creditSystemApi } from '../creditSystemApi';
import { canonical } from '../decimal';
import { formatCredits, formatUsd, formatWhen, NOT_AVAILABLE } from '../format';
import { useGrantBudget, usePlanBudgets, useRemoveLimits, useRemovePlanBudget, useSaveLimits, useSavePlanBudget, useWorkspaceBudget, useWorkspaceLimits } from '../hooks';
import { fieldErrors, grantSchema, planBudgetSchema } from '../schemas';
import type { PlanBudget, WorkspaceHit } from '../types';
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

function WorkspaceBudgetPanel({ organizationId, canWrite }: { organizationId: string; canWrite: boolean }) {
  const query = useWorkspaceBudget(organizationId);
  const limits = useWorkspaceLimits();
  const saveLimits = useSaveLimits();
  const removeLimits = useRemoveLimits();
  const grant = useGrantBudget();
  const [override, setOverride] = useState<string | null>(null);
  const [overrideProblem, setOverrideProblem] = useState<string | undefined>();
  const [granting, setGranting] = useState<{ reason: string; key: string } | null>(null);
  const [grantProblem, setGrantProblem] = useState<string | undefined>();
  const [notice, setNotice] = useState<NoticeState | null>(null);

  if (query.isError) return <LoadFailed error={query.error} what="the workspace budget" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data) return <Skeleton className="h-48 w-full" />;
  const data = query.data;
  const existing = limits.data?.items.find((row) => row.organizationId === organizationId) ?? null;

  const submitOverride = () => {
    const value = (override ?? '').trim();
    if (value !== '' && !(/^\d{1,12}(\.\d{1,6})?$/.test(value) && /[1-9]/.test(value))) return setOverrideProblem('A positive USD amount with up to 6 decimal places, or empty to use the plan’s budget');
    setOverrideProblem(undefined);
    const others = { maxSpendUsd: existing?.maxSpendUsd ?? null, monthlyLimitUsd: existing?.monthlyLimitUsd ?? null, dailyLimitUsd: existing?.dailyLimitUsd ?? null, perTurnLimitUsd: existing?.perTurnLimitUsd ?? null };
    const nothingLeft = value === '' && Object.values(others).every((entry) => entry === null);
    const done = () => { setOverride(null); setNotice({ message: value === '' ? 'The workspace now uses its plan’s budget.' : 'The workspace budget was saved.', tone: 'success' }); };
    if (nothingLeft) {
      if (existing) removeLimits.mutate(organizationId, { onSuccess: done });
      else done();
      return;
    }
    saveLimits.mutate({ organizationId, limits: { expectedVersion: existing?.version ?? null, budgetUsd: value === '' ? null : value, ...others } }, { onSuccess: done });
  };

  const submitGrant = () => {
    const parsed = grantSchema.safeParse({ reason: granting?.reason ?? '' });
    if (!parsed.success) return setGrantProblem(parsed.error.issues[0]?.message);
    setGrantProblem(undefined);
    grant.mutate(
      { organizationId, grant: { expectedCredits: data.effective.credits!, reason: parsed.data.reason, idempotencyKey: granting!.key } },
      { onSuccess: (result) => { setGranting(null); setNotice({ message: result.replay ? 'That grant was already made: nothing was added again.' : `${formatCredits(result.credits)} credits were granted.`, tone: 'success' }); } },
    );
  };

  return (
    <div className="space-y-4">
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[14rem_1fr]">
        <dt className="text-muted-foreground">Workspace</dt>
        <dd className="font-medium">{data.name}</dd>
        <dt className="text-muted-foreground">Plan</dt>
        <dd>
          {data.plan.name ?? data.plan.slug} · budget {data.plan.usdBudget === null ? 'not set' : formatUsd(data.plan.usdBudget)} · markup {data.plan.markupPercent === null ? 'not set' : `${data.plan.markupPercent}%`}
        </dd>
        <dt className="text-muted-foreground">This workspace’s own budget</dt>
        <dd>{data.workspaceBudgetUsd === null ? 'None: the plan’s budget applies' : formatUsd(data.workspaceBudgetUsd)}</dd>
        <dt className="text-muted-foreground">Budget in force</dt>
        <dd className="font-medium">{data.effective.budgetUsd === null ? NOT_AVAILABLE : `${formatUsd(data.effective.budgetUsd)} (${data.effective.source === 'workspace' ? 'workspace override' : 'plan default'})`}</dd>
        <dt className="text-muted-foreground">Worth in credits</dt>
        <dd className="font-medium tabular-nums">{data.effective.credits === null ? `${NOT_AVAILABLE} · ${missingText(data.effective.missing)}` : formatCredits(data.effective.credits)}</dd>
        <dt className="text-muted-foreground">Credits in the wallet now</dt>
        <dd className="tabular-nums">{formatCredits(data.wallet.available)} available · {formatCredits(data.wallet.reserved)} held</dd>
      </dl>

      {canWrite && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="override-budget">Set this workspace’s own budget (USD)</Label>
              <Input id="override-budget" value={override ?? ''} placeholder="e.g. 100" inputMode="decimal" autoComplete="off" className="w-48" onChange={(event) => setOverride(event.target.value)} />
            </div>
            <Button type="button" variant="outline" disabled={override === null || saveLimits.isPending || removeLimits.isPending} onClick={submitOverride}>
              Save budget
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Raise or lower the workspace’s budget, or leave the box empty and save to go back to the plan’s. The credits are recalculated. The workspace’s other limits are kept as they are.</p>
          <Problem>{overrideProblem}</Problem>
          {saveLimits.error ? <Problem>{apiErrorMessage(saveLimits.error, 'The budget could not be saved.')}</Problem> : null}
          <div>
            <Button type="button" disabled={data.effective.credits === null} onClick={() => { grant.reset(); setGrantProblem(undefined); setGranting({ reason: '', key: newKey() }); }}>
              Grant {data.effective.credits === null ? 'budget' : `${formatCredits(data.effective.credits)} credits`}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">Nothing renews by itself: the workspace receives its budget only when you grant it here.</p>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Budgets granted</p>
        {data.grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has been granted to this workspace.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>API budget</TableHead>
                <TableHead>Markup</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.grants.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{formatWhen(row.createdAt)}</TableCell>
                  <TableCell>{row.source === 'workspace' ? 'Workspace override' : 'Plan'}</TableCell>
                  <TableCell>{formatUsd(row.usdBudget)}</TableCell>
                  <TableCell>{canonical(row.markupPercent)}%</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCredits(row.credits)}</TableCell>
                  <TableCell className="max-w-56 truncate text-xs">{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {granting && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || grant.isPending ? undefined : setGranting(null))}
          title={`Grant ${formatCredits(data.effective.credits)} credits to ${data.name}?`}
          description="This adds credit to the workspace’s wallet. It appears in the ledger under your name, with the reason, and cannot be taken back except by an adjustment."
          confirmLabel="Grant credits"
          isPending={grant.isPending}
          onConfirm={submitGrant}
        >
          <div className="space-y-2 text-sm">
            <p className="font-mono text-xs">
              {formatUsd(data.effective.budgetUsd)} × (1 + {data.effective.markupPercent}%) ÷ credit value = {formatCredits(data.effective.credits)} credits
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="grant-reason">Reason</Label>
              <Input id="grant-reason" value={granting.reason} autoComplete="off" onChange={(event) => setGranting({ ...granting, reason: event.target.value })} />
              <Problem>{grantProblem}</Problem>
            </div>
            {grant.error ? <Problem>{apiErrorMessage(grant.error, 'The grant could not be made.')}</Problem> : null}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}

/** Finds a workspace by workspace ID, client (user) ID or name, and manages its budget. */
function WorkspaceBudget({ canWrite }: { canWrite: boolean }) {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<WorkspaceHit[] | null>(null);
  const [problem, setProblem] = useState<string | undefined>();
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const search = async () => {
    const q = term.trim();
    if (q.length < 2) return setProblem('Enter at least 2 characters');
    setProblem(undefined);
    setSearching(true);
    setSelected(null);
    try {
      setHits(await creditSystemApi.searchWorkspaces(q));
    } catch (error) {
      setProblem(apiErrorMessage(error, 'The search failed.'));
      setHits(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace budget</CardTitle>
        <CardDescription>Find a workspace by its workspace ID, a client’s user ID, or its name. A workspace can have its own USD budget in place of its plan’s, for example an Enterprise client with more than the plan default.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="flex flex-wrap items-end gap-3" noValidate onSubmit={(event) => { event.preventDefault(); void search(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="budget-search">Workspace ID, client ID or name</Label>
            <Input id="budget-search" value={term} placeholder="e.g. 018f0000-0000-7000-8000-000000000001" autoComplete="off" className="w-96 max-w-full" onChange={(event) => setTerm(event.target.value)} />
          </div>
          <Button type="submit" variant="outline" disabled={searching}>
            <Search className="size-4" aria-hidden /> Find
          </Button>
        </form>
        <Problem>{problem}</Problem>
        {hits !== null && hits.length === 0 && <p className="text-sm text-muted-foreground">No workspace matches.</p>}
        {hits !== null && hits.length > 0 && (
          <ul className="divide-y divide-border rounded-md border border-border" aria-label="Workspaces found">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button type="button" className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-muted/50" aria-pressed={selected === hit.id} onClick={() => setSelected(hit.id)}>
                  <span>
                    <span className="font-medium">{hit.name}</span> <span className="font-mono text-xs text-muted-foreground">{hit.id}</span>
                  </span>
                  <Badge variant="outline">{hit.plan}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && <WorkspaceBudgetPanel key={selected} organizationId={selected} canWrite={canWrite} />}
      </CardContent>
    </Card>
  );
}

/** Plan configuration and workspace budgets: where the markup and the budgets are set, and where a workspace is granted its budget. */
export function PlansTab({ canWrite }: { canWrite: boolean }) {
  return (
    <div className="space-y-6">
      <PlanConfiguration canWrite={canWrite} />
      <WorkspaceBudget canWrite={canWrite} />
    </div>
  );
}
