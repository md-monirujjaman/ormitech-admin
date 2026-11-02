import { CircleAlert, CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/apiError';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { formatCredits, formatWhen, MODE_EXPLANATION, MODE_LABEL } from '../format';
import { useCreditPolicy, useReconciliation, useUpdateCreditPolicy } from '../hooks';
import { fieldErrors, policySchema } from '../schemas';
import type { CreditMode, CreditPolicy, UpdatePolicyInput } from '../types';

type Notice = { message: string; tone: 'success' | 'error' } | null;

const blank = (policy: CreditPolicy) => ({
  mode: policy.mode,
  creditsPerCostUnit: policy.creditsPerCostUnit === null ? '' : formatCredits(policy.creditsPerCostUnit).replace(/,/g, ''),
  costCurrency: policy.costCurrency ?? '',
  markupPercent: policy.markupPercent === null ? '' : formatCredits(policy.markupPercent).replace(/,/g, ''),
  rounding: policy.rounding,
  estimateCharsPerToken: formatCredits(policy.estimateCharsPerToken).replace(/,/g, ''),
  reservationTtlSeconds: String(policy.reservationTtlSeconds),
});

/**
 * The platform's credit policy: the mode, and the conversion from the provider's cost to credits (rate, currency, markup,
 * rounding). Nothing is decided for you: every business value starts empty, credits are not computed until the conversion is
 * complete, and the mode cannot be turned on before it is. Each change is audited with what it was and became.
 */
export function CreditPolicyTab({ canWrite }: { canWrite: boolean }) {
  const query = useCreditPolicy();
  const books = useReconciliation();
  const update = useUpdateCreditPolicy();
  const [values, setValues] = useState<ReturnType<typeof blank> | null>(null);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<UpdatePolicyInput | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (query.data) setValues(blank(query.data));
  }, [query.data]);

  if (query.isError) return <LoadFailed error={query.error} what="the credit policy" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data || !values) return <Skeleton className="h-72 w-full" />;
  const policy = query.data;

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((current) => (current ? { ...current, [key]: value } : current));

  const review = () => {
    const parsed = policySchema.safeParse(values);
    if (!parsed.success) return setProblems(fieldErrors(parsed.error));
    setProblems({});
    const decided = parsed.data.creditsPerCostUnit !== '';
    const input: UpdatePolicyInput = {
      mode: parsed.data.mode,
      creditsPerCostUnit: decided ? parsed.data.creditsPerCostUnit : null,
      costCurrency: decided ? parsed.data.costCurrency : null,
      markupPercent: decided ? parsed.data.markupPercent : null,
      rounding: parsed.data.rounding,
      estimateCharsPerToken: parsed.data.estimateCharsPerToken,
      reservationTtlSeconds: Number(parsed.data.reservationTtlSeconds),
    };
    setConfirm(input);
  };

  const field = (key: keyof typeof values, label: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`policy-${key}`}>{label}</Label>
      <Input id={`policy-${key}`} value={String(values[key])} disabled={!canWrite} autoComplete="off" onChange={(event) => set(key, event.target.value as never)} />
      {hint && !problems[key] && <p className="text-xs text-muted-foreground">{hint}</p>}
      {problems[key] && (
        <p role="alert" className="text-xs text-destructive">
          {problems[key]}
        </p>
      )}
    </div>
  );

  const changes = confirm
    ? [
        policy.mode !== confirm.mode && `mode ${MODE_LABEL[policy.mode]} → ${MODE_LABEL[confirm.mode as CreditMode]}`,
        (policy.creditsPerCostUnit ?? null) !== (confirm.creditsPerCostUnit ?? null) && `rate ${policy.creditsPerCostUnit === null ? 'not set' : formatCredits(policy.creditsPerCostUnit)} → ${confirm.creditsPerCostUnit === null ? 'not set' : formatCredits(confirm.creditsPerCostUnit ?? null)}`,
        (policy.costCurrency ?? null) !== (confirm.costCurrency ?? null) && `currency ${policy.costCurrency ?? 'not set'} → ${confirm.costCurrency ?? 'not set'}`,
        (policy.markupPercent ?? null) !== (confirm.markupPercent ?? null) && `markup ${policy.markupPercent === null ? 'not set' : `${formatCredits(policy.markupPercent)}%`} → ${confirm.markupPercent === null ? 'not set' : `${formatCredits(confirm.markupPercent ?? null)}%`}`,
        policy.rounding !== confirm.rounding && `rounding ${policy.rounding} → ${confirm.rounding}`,
        Number(policy.estimateCharsPerToken) !== Number(confirm.estimateCharsPerToken) && `estimate ${formatCredits(policy.estimateCharsPerToken)} → ${confirm.estimateCharsPerToken} characters per token`,
        policy.reservationTtlSeconds !== confirm.reservationTtlSeconds && `hold lasts ${policy.reservationTtlSeconds}s → ${confirm.reservationTtlSeconds}s`,
      ].filter((entry): entry is string => Boolean(entry))
    : [];

  return (
    <div className="space-y-6">
      {notice && (
        <div role={notice.tone === 'error' ? 'alert' : 'status'} className={`rounded-md border p-3 text-sm ${notice.tone === 'error' ? 'border-destructive/40 bg-destructive/10' : 'border-success/40 bg-success/10'}`}>
          {notice.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Credit policy</CardTitle>
          <CardDescription>
            How the provider’s cost becomes credits, and whether credits are counted at all. <Badge variant={policy.conversionDecided ? 'success' : 'outline'}>{policy.conversionDecided ? 'Conversion decided' : 'Conversion not decided'}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              update.reset();
              review();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="policy-mode">Platform mode</Label>
              <Select value={values.mode} disabled={!canWrite} onValueChange={(value) => set('mode', value as CreditMode)}>
                <SelectTrigger id="policy-mode" aria-label="Platform mode" className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="observe">Observe</SelectItem>
                  <SelectItem value="enforce">Enforce</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{MODE_EXPLANATION[values.mode]} A workspace can be set to its own mode, which wins over this one.</p>
              {problems.mode && (
                <p role="alert" className="text-xs text-destructive">
                  {problems.mode}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {field('creditsPerCostUnit', 'Credits per 1 unit of currency', 'For example 1000 credits per 1 USD. Leave all three empty until decided.')}
              {field('costCurrency', 'Currency of the cost', 'Three letters, for example USD.')}
              {field('markupPercent', 'Markup (percent)', '0 means no markup; empty means not decided.')}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="policy-rounding">Rounding</Label>
                <Select value={values.rounding} disabled={!canWrite} onValueChange={(value) => set('rounding', value as CreditPolicy['rounding'])}>
                  <SelectTrigger id="policy-rounding" aria-label="Rounding">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="half_up">Half up</SelectItem>
                    <SelectItem value="up">Always up</SelectItem>
                    <SelectItem value="down">Always down</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Applied once, to the credits, at the end.</p>
              </div>
              {field('estimateCharsPerToken', 'Characters per token (estimate)', 'Used to size a hold before the call. Between 1 and 10.')}
              {field('reservationTtlSeconds', 'A hold lasts (seconds)', 'After this a hold that was never settled returns its credit.')}
            </div>

            {query.data && (
              <p className="text-xs text-muted-foreground">
                Last changed {formatWhen(policy.updatedAt)}.
              </p>
            )}
            {canWrite && (
              <Button type="submit" disabled={update.isPending}>
                Review changes
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reconciliation</CardTitle>
          <CardDescription>Every credit bucket in the platform, checked against the ledger. An empty result means the books agree.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {books.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(books.error, 'The check could not be run.')}
            </p>
          ) : books.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : books.data?.ok ? (
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CircleCheck className="size-4" aria-hidden /> All buckets reconcile
            </p>
          ) : (
            <div role="alert" className="space-y-1 text-sm">
              <p className="flex items-center gap-2 font-medium text-destructive">
                <CircleAlert className="size-4" aria-hidden /> {books.data?.mismatches.length} bucket(s) do not match their ledger
              </p>
              <ul className="font-mono text-xs">
                {books.data?.mismatches.map((mismatch) => (
                  <li key={`${mismatch.bucketId}-${mismatch.check}`}>
                    workspace {mismatch.organizationId.slice(0, 8)} · bucket {mismatch.bucketId.slice(0, 8)} · {mismatch.check}: stored {formatCredits(mismatch.stored)}, ledger {formatCredits(mismatch.expected)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="outline" size="sm" disabled={books.isFetching} onClick={() => void books.refetch()}>
            {books.isFetching ? 'Checking…' : 'Check again'}
          </Button>
        </CardContent>
      </Card>

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || update.isPending ? undefined : setConfirm(null))}
          title={confirm.mode === 'enforce' && policy.mode !== 'enforce' ? 'Enforce credits across the platform?' : 'Save the credit policy?'}
          description={
            confirm.mode === 'enforce' && policy.mode !== 'enforce'
              ? 'Every workspace without its own setting will be held to its credit: with no credit its customers get no AI reply and are handed to a person. Switch workspaces on one at a time instead, unless you mean this.'
              : 'These values decide how every AI request is counted from now on. Requests already counted keep the figures they were counted with.'
          }
          confirmLabel="Save policy"
          destructive={confirm.mode === 'enforce' && policy.mode !== 'enforce'}
          isPending={update.isPending}
          onConfirm={() =>
            update.mutate(confirm, {
              onSuccess: () => {
                setConfirm(null);
                setNotice({ message: 'The credit policy was saved.', tone: 'success' });
              },
            })
          }
        >
          <div className="space-y-1 text-sm">
            {changes.length === 0 ? <p className="text-muted-foreground">Nothing changes.</p> : changes.map((change) => <p key={change} className="font-mono text-xs">{change}</p>)}
            {update.error ? (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(update.error, 'The policy could not be saved.')}
              </p>
            ) : null}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
