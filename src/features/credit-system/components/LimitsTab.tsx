import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { formatUsd, formatWhen, NOT_AVAILABLE } from '../format';
import { useRemoveLimits, useSaveLimits, useWorkspaceLimits } from '../hooks';
import { fieldErrors, LIMIT_FIELDS, limitsSchema, workspaceIdSchema, type LimitsForm } from '../schemas';
import type { LimitsInput, WorkspaceLimits } from '../types';
import { Notice, Problem, type NoticeState } from './shared';

const EMPTY: LimitsForm = { budgetUsd: '', maxSpendUsd: '', monthlyLimitUsd: '', dailyLimitUsd: '', perTurnLimitUsd: '' };

const toForm = (limits: WorkspaceLimits): LimitsForm => ({
  budgetUsd: limits.budgetUsd ?? '',
  maxSpendUsd: limits.maxSpendUsd ?? '',
  monthlyLimitUsd: limits.monthlyLimitUsd ?? '',
  dailyLimitUsd: limits.dailyLimitUsd ?? '',
  perTurnLimitUsd: limits.perTurnLimitUsd ?? '',
});

/** Sets, changes or removes a workspace's USD limits. The workspace is chosen by its ID when new; the API refuses an ID that is not a workspace. */
function LimitsDialog({ open, existing, onOpenChange, isPending, error, onSubmit }: { open: boolean; existing: WorkspaceLimits | null; onOpenChange: (open: boolean) => void; isPending: boolean; error: unknown; onSubmit: (organizationId: string, input: LimitsInput) => void }) {
  const [workspace, setWorkspace] = useState('');
  const [values, setValues] = useState<LimitsForm>(EMPTY);
  const [problems, setProblems] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setWorkspace(existing?.organizationId ?? '');
    setValues(existing ? toForm(existing) : EMPTY);
    setProblems({});
  }, [open, existing]);

  const submit = () => {
    const id = workspaceIdSchema.shape.organizationId.safeParse(workspace);
    const limits = limitsSchema.safeParse(values);
    const found: Record<string, string> = {};
    if (!id.success) found.organizationId = id.error.issues[0]?.message ?? 'Enter a workspace ID';
    if (!limits.success) Object.assign(found, fieldErrors(limits.error));
    setProblems(found);
    if (!id.success || !limits.success) return;
    const pick = (value: string) => (value === '' ? null : value);
    onSubmit(id.data.toLowerCase(), {
      expectedVersion: existing?.version ?? null,
      budgetUsd: pick(limits.data.budgetUsd),
      maxSpendUsd: pick(limits.data.maxSpendUsd),
      monthlyLimitUsd: pick(limits.data.monthlyLimitUsd),
      dailyLimitUsd: pick(limits.data.dailyLimitUsd),
      perTurnLimitUsd: pick(limits.data.perTurnLimitUsd),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? `Limits for ${existing.name}` : 'Set workspace limits'}</DialogTitle>
          <DialogDescription>Amounts are in US dollars. A limit left empty is not set. Limits are recorded and shown here: nothing refuses an AI request because of them yet.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="limits-workspace">Workspace ID</Label>
            <Input id="limits-workspace" value={workspace} disabled={Boolean(existing)} placeholder="e.g. 018f0000-0000-7000-8000-000000000001" autoComplete="off" onChange={(event) => setWorkspace(event.target.value)} />
            <Problem>{problems.organizationId}</Problem>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {LIMIT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`limit-${field.key}`}>{field.label} (USD)</Label>
                <Input id={`limit-${field.key}`} value={values[field.key]} placeholder="e.g. 2" inputMode="decimal" autoComplete="off" onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} />
                {problems[field.key] ? <Problem>{problems[field.key]}</Problem> : <p className="text-xs text-muted-foreground">{field.hint}</p>}
              </div>
            ))}
          </div>
          {error ? <Problem>{apiErrorMessage(error, 'The limits could not be saved.')}</Problem> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save limits'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** What each workspace may spend. Stored and shown with what it has used (in verified USD once the cost unit is verified; otherwise Not available). */
export function LimitsTab({ canWrite }: { canWrite: boolean }) {
  const query = useWorkspaceLimits();
  const save = useSaveLimits();
  const remove = useRemoveLimits();
  const [editing, setEditing] = useState<{ existing: WorkspaceLimits | null } | null>(null);
  const [removing, setRemoving] = useState<WorkspaceLimits | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  if (query.isError) return <LoadFailed error={query.error} what="the workspace limits" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data) return <Skeleton className="h-64 w-full" />;
  const data = query.data;
  const cell = (value: string | null) => (value === null ? <span className="text-muted-foreground">Not set</span> : formatUsd(value));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle>Workspace budget and spending limits</CardTitle>
            <CardDescription>USD per workspace: a budget, a maximum spend, and monthly, daily and per-turn limits. They must be in order: per turn ≤ daily ≤ monthly ≤ maximum spend, and budget ≤ maximum spend.</CardDescription>
          </div>
          {canWrite && (
            <Button type="button" onClick={() => { save.reset(); setEditing({ existing: null }); }}>
              <Plus className="size-4" aria-hidden /> Set limits
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Recorded, not enforced</Badge>
          {!data.spendAvailable && <Badge variant="warning">Usage {NOT_AVAILABLE}: the cost unit is not verified</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        {data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workspace has limits.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Max spend</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Daily</TableHead>
                <TableHead>Per turn</TableHead>
                <TableHead>Used today / month / total</TableHead>
                <TableHead>Changed</TableHead>
                {canWrite && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.organizationId}>
                  <TableCell>
                    <p className="font-medium">{row.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{row.organizationId.slice(0, 8)}…</p>
                  </TableCell>
                  <TableCell>{cell(row.budgetUsd)}</TableCell>
                  <TableCell>{cell(row.maxSpendUsd)}</TableCell>
                  <TableCell>{cell(row.monthlyLimitUsd)}</TableCell>
                  <TableCell>{cell(row.dailyLimitUsd)}</TableCell>
                  <TableCell>{cell(row.perTurnLimitUsd)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{row.spend ? `${formatUsd(row.spend.today)} / ${formatUsd(row.spend.month)} / ${formatUsd(row.spend.total)}` : <span className="text-muted-foreground">{NOT_AVAILABLE}</span>}</TableCell>
                  <TableCell className="text-xs">{formatWhen(row.updatedAt)}</TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" aria-label={`Edit the limits of ${row.name}`} onClick={() => { save.reset(); setEditing({ existing: row }); }}>
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label={`Remove the limits of ${row.name}`} onClick={() => { remove.reset(); setRemoving(row); }}>
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <LimitsDialog
        open={editing !== null}
        existing={editing?.existing ?? null}
        onOpenChange={(open) => (open || save.isPending ? undefined : setEditing(null))}
        isPending={save.isPending}
        error={save.error}
        onSubmit={(organizationId, limits) =>
          save.mutate(
            { organizationId, limits },
            {
              onSuccess: () => {
                setEditing(null);
                setNotice({ message: 'The limits were saved.', tone: 'success' });
              },
            },
          )
        }
      />

      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || remove.isPending ? undefined : setRemoving(null))}
          title={`Remove the limits of ${removing.name}?`}
          description="The workspace has no budget or spending limit afterwards. The change is recorded in the audit log."
          confirmLabel="Remove limits"
          destructive
          isPending={remove.isPending}
          onConfirm={() => remove.mutate(removing.organizationId, { onSuccess: () => { setRemoving(null); setNotice({ message: 'The limits were removed.', tone: 'success' }); } })}
        >
          {remove.error ? <Problem>{apiErrorMessage(remove.error, 'The limits could not be removed.')}</Problem> : null}
        </ConfirmDialog>
      )}
    </Card>
  );
}
