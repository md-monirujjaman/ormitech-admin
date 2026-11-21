import { Calculator, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { apiErrorMessage } from '@/lib/apiError';
import { canonical } from '../decimal';
import { formatCredits, formatWhen } from '../format';
import { useCreditSettings, usePreview, useSaveFinancial } from '../hooks';
import { fieldErrors, financialSchema, ROUNDING_LABEL, type FinancialForm } from '../schemas';
import type { CreditSettings, RoundingMode } from '../types';
import { Notice, Problem, type NoticeState } from './shared';

/** What the form shows for the saved values: an empty field is "not decided". */
const formFrom = (settings: CreditSettings): FinancialForm => ({
  creditValueUsd: settings.financial.creditValueUsd ?? '',
  markupPercentage: settings.financial.markupPercentage ?? '',
  roundingMode: settings.financial.roundingMode ?? '',
  decimalPlaces: settings.financial.decimalPlaces === null ? '' : String(settings.financial.decimalPlaces),
});

const same = (a: FinancialForm, b: FinancialForm) => canonical(a.creditValueUsd || null) === canonical(b.creditValueUsd || null) && canonical(a.markupPercentage || null) === canonical(b.markupPercentage || null) && a.roundingMode === b.roundingMode && a.decimalPlaces === b.decimalPlaces;

const SAVED = (value: string | null, suffix = '') => (value === null ? <Badge variant="outline">Not set</Badge> : <span className="font-mono text-xs">{value}{suffix}</span>);

/**
 * The financial settings of the verified-USD billing rules: the USD value of one credit, the markup, the rounding mode and the
 * precision. Each shows its saved value next to the box, and the grey text inside an empty box is an example, never a value. Nothing is
 * saved until the administrator has seen what changes, and a save made on top of someone else's newer one is refused.
 */
export function FinancialCard({ canWrite, onDirtyChange }: { canWrite: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const query = useCreditSettings();
  const save = useSaveFinancial();
  const preview = usePreview();
  const [values, setValues] = useState<FinancialForm | null>(null);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<FinancialForm | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [cost, setCost] = useState('');
  const [costProblem, setCostProblem] = useState<string | undefined>();
  const loadedVersion = useRef<number | null>(null);
  const settings = query.data;

  const dirty = Boolean(settings && values && !same(values, formFrom(settings)));
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  // The form follows the saved values, but never throws away what is being typed: a newer saved version is offered, not forced.
  useEffect(() => {
    if (!settings) return;
    if (loadedVersion.current === null || (!dirty && loadedVersion.current !== settings.version)) {
      setValues(formFrom(settings));
      loadedVersion.current = settings.version;
    }
  }, [settings, dirty]);

  if (query.isError) return <LoadFailed error={query.error} what="the credit settings" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !settings || !values) return <Skeleton className="h-80 w-full" />;
  const saved = formFrom(settings);
  const outdated = loadedVersion.current !== null && loadedVersion.current !== settings.version && dirty;
  const set = <K extends keyof FinancialForm>(key: K, value: FinancialForm[K]) => setValues((current) => (current ? { ...current, [key]: value } : current));

  const review = () => {
    const parsed = financialSchema.safeParse(values);
    if (!parsed.success) return setProblems(fieldErrors(parsed.error));
    setProblems({});
    setConfirm(parsed.data);
  };

  const changes = confirm
    ? ([
        ['Credit value (USD per credit)', saved.creditValueUsd, confirm.creditValueUsd],
        ['Markup (%)', saved.markupPercentage, confirm.markupPercentage],
        ['Rounding mode', saved.roundingMode && ROUNDING_LABEL[saved.roundingMode], confirm.roundingMode && ROUNDING_LABEL[confirm.roundingMode]],
        ['Decimal places', saved.decimalPlaces, confirm.decimalPlaces],
      ] as Array<[string, string | undefined, string | undefined]>).filter(([, from, to]) => canonical(from || null) !== canonical(to || null))
    : [];
  const clearing = confirm ? Object.values(confirm).some((value) => value === '') : false;

  const calculate = () => {
    if (!/^\d{1,12}(\.\d{1,14})?$/.test(cost.trim())) return setCostProblem('Enter a USD amount such as 0.008 (digits and one point)');
    setCostProblem(undefined);
    preview.mutate(cost.trim());
  };

  const field = (key: 'creditValueUsd' | 'markupPercentage' | 'decimalPlaces', label: string, example: string, savedValue: string | null, hint: string, suffix = '') => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`fin-${key}`}>{label}</Label>
        <span className="text-xs text-muted-foreground">Saved: {SAVED(savedValue, suffix)}</span>
      </div>
      <Input id={`fin-${key}`} value={values[key]} placeholder={`e.g. ${example}`} disabled={!canWrite} autoComplete="off" inputMode="decimal" onChange={(event) => set(key, event.target.value)} />
      {!problems[key] && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Problem>{problems[key]}</Problem>
    </div>
  );

  return (
    <div className="space-y-6">
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      <Card>
        <CardHeader>
          <CardTitle>Financial settings</CardTitle>
          <CardDescription>
            How verified actual AI cost in USD becomes credits: marked cost = cost × (1 + markup ÷ 100), credits = marked cost ÷ credit value. The costs of all the requests of one customer turn are added first, and the result is rounded once, when the credits are taken. No value is assumed: empty means not decided.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={settings.financial.complete ? 'success' : 'warning'}>{settings.financial.complete ? 'All four set' : `Not set: ${settings.financial.missing.length} of 4`}</Badge>
            <span className="text-xs text-muted-foreground">Settings version {settings.version} · last saved {formatWhen(settings.version === 0 ? null : settings.updatedAt)}</span>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              save.reset();
              review();
            }}
          >
            {outdated && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <TriangleAlert className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">These settings were saved by someone else after you opened them. Saving would be refused.</span>
                <Button type="button" size="sm" variant="outline" onClick={() => { setValues(saved); loadedVersion.current = settings.version; setProblems({}); }}>
                  Load the saved values
                </Button>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {field('creditValueUsd', 'Credit value (USD per credit)', '0.0001', settings.financial.creditValueUsd, 'What one credit is worth, in US dollars. Greater than zero, up to 12 decimal places.')}
              {field('markupPercentage', 'Markup (percent)', '200', settings.financial.markupPercentage, '0 means no markup; empty means not decided. At most 10000.', '%')}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="fin-roundingMode">Rounding mode</Label>
                  <span className="text-xs text-muted-foreground">Saved: {SAVED(settings.financial.roundingMode && ROUNDING_LABEL[settings.financial.roundingMode]!)}</span>
                </div>
                <Select value={values.roundingMode === '' ? 'none' : values.roundingMode} disabled={!canWrite} onValueChange={(value) => set('roundingMode', value === 'none' ? '' : (value as RoundingMode))}>
                  <SelectTrigger id="fin-roundingMode" aria-label="Rounding mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not decided</SelectItem>
                    {settings.bounds.roundingModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {ROUNDING_LABEL[mode]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Used once, where the credits of a turn are taken.</p>
                <Problem>{problems.roundingMode}</Problem>
              </div>
              {field('decimalPlaces', 'Decimal places of the debit', '2', settings.financial.decimalPlaces === null ? null : String(settings.financial.decimalPlaces), `A whole number from ${settings.bounds.decimalPlaces.min} to ${settings.bounds.decimalPlaces.max}.`)}
            </div>

            {(values.creditValueUsd === '' || values.markupPercentage === '' || values.roundingMode === '' || values.decimalPlaces === '') && (
              <p className="text-xs text-muted-foreground">Until all four are set, no credit can be calculated from AI cost.</p>
            )}

            {settings.legacyConversion.consistency.status === 'different' && (
              <div role="status" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{settings.legacyConversion.consistency.detail} The older conversion is {formatCredits(settings.legacyConversion.creditsPerCostUnit)} credits per {settings.legacyConversion.costCurrency} with {formatCredits(settings.legacyConversion.markupPercent)}% markup (see the Credit policy tab of the AI gateway page).</span>
              </div>
            )}

            {canWrite && (
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={save.isPending || !dirty}>
                  Review changes
                </Button>
                {dirty && <span className="text-xs text-warning">Unsaved changes</span>}
                {dirty && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setValues(saved); setProblems({}); }}>
                    Discard
                  </Button>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="size-4" aria-hidden /> Try the saved settings
          </CardTitle>
          <CardDescription>A calculation with the saved values for a verified cost you type. Nothing is saved, held or charged.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="preview-cost">Verified cost (USD)</Label>
              <Input id="preview-cost" value={cost} placeholder="e.g. 0.008" autoComplete="off" inputMode="decimal" onChange={(event) => setCost(event.target.value)} className="w-48" />
            </div>
            <Button type="button" variant="outline" disabled={preview.isPending || !settings.financial.complete} onClick={calculate}>
              Calculate
            </Button>
          </div>
          {!settings.financial.complete && <p className="text-xs text-muted-foreground">Set all four values and save them first.</p>}
          <Problem>{costProblem}</Problem>
          {preview.error ? <Problem>{apiErrorMessage(preview.error, 'The calculation could not be made.')}</Problem> : null}
          {preview.data && !preview.isPending && (
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2" aria-label="Calculation result">
              <dt className="text-muted-foreground">Marked cost (USD)</dt>
              <dd className="font-mono text-xs">{canonical(preview.data.markedCostUsd)}</dd>
              <dt className="text-muted-foreground">Credits before rounding</dt>
              <dd className="font-mono text-xs">{canonical(preview.data.creditsUnrounded)}</dd>
              <dt className="font-medium">Credits after rounding</dt>
              <dd className="font-mono text-xs font-medium">{preview.data.credits}</dd>
              <dt className="text-muted-foreground">Settings version used</dt>
              <dd className="font-mono text-xs">{preview.data.settings.version}</dd>
            </dl>
          )}
        </CardContent>
      </Card>

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || save.isPending ? undefined : setConfirm(null))}
          title="Save the financial settings?"
          description="These values decide how verified AI cost becomes credits for every workspace, from now on. A turn that was already settled keeps the values it was settled with."
          confirmLabel="Save settings"
          destructive={clearing}
          isPending={save.isPending}
          onConfirm={() =>
            save.mutate(
              {
                expectedVersion: settings.version,
                creditValueUsd: confirm.creditValueUsd === '' ? null : confirm.creditValueUsd,
                markupPercentage: confirm.markupPercentage === '' ? null : confirm.markupPercentage,
                roundingMode: confirm.roundingMode === '' ? null : confirm.roundingMode,
                decimalPlaces: confirm.decimalPlaces === '' ? null : Number(confirm.decimalPlaces),
              },
              {
                onSuccess: () => {
                  setConfirm(null);
                  loadedVersion.current = null;
                  setNotice({ message: 'The financial settings were saved.', tone: 'success' });
                },
              },
            )
          }
        >
          <div className="space-y-1 text-sm">
            {changes.length === 0 ? <p className="text-muted-foreground">Nothing changes.</p> : changes.map(([label, from, to]) => <p key={label} className="font-mono text-xs">{label}: {from || 'not set'} → {to || 'not set'}</p>)}
            {clearing && <p className="text-xs text-warning">A value is being cleared: credits cannot be calculated until it is set again.</p>}
            {save.error ? <Problem>{apiErrorMessage(save.error, 'The settings could not be saved.')}</Problem> : null}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
