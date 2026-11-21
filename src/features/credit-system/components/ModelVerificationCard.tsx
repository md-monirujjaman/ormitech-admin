import { ShieldCheck, ShieldQuestion } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { apiErrorMessage } from '@/lib/apiError';
import { isDecimal, isZero, places } from '../decimal';
import { formatWhen } from '../format';
import { useModelVerifications, useRevokeModelVerification, useVerifyModel } from '../hooks';
import { Notice, Problem, type NoticeState } from './shared';

const GENERATION = /^gen-[A-Za-z0-9_-]{1,120}$/;

/**
 * Whether each model's provider cost is verified as USD. OpenRouter reports `usage.cost` in a unit that is not assumed to be dollars: it is verified
 * per model, with written evidence and the generation ids it rests on, and a verification says nothing about any other model. A cost of a model with
 * no verification stays unverified: it is shown as such and nothing is billed from it.
 */
export function ModelVerificationCard({ canWrite }: { canWrite: boolean }) {
  const query = useModelVerifications();
  const verify = useVerifyModel();
  const revoke = useRevokeModelVerification();
  const [target, setTarget] = useState<string | null>(null);
  const [values, setValues] = useState({ costUnit: '', usdFactor: '', generationIds: '', evidence: '' });
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ modelId: string; costUnit: string; usdFactor: string; evidence: string; generationIds: string[] } | null>(null);
  const [revoking, setRevoking] = useState<{ id: string; modelId: string; reason: string } | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  if (query.isError) return <LoadFailed error={query.error} what="the model cost verifications" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data) return <Skeleton className="h-48 w-full" />;
  const data = query.data;

  const open = (modelId: string) => {
    verify.reset();
    setValues({ costUnit: '', usdFactor: '', generationIds: '', evidence: '' });
    setProblems({});
    setTarget(modelId);
  };

  const review = () => {
    const found: Record<string, string> = {};
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(values.costUnit.trim())) found.costUnit = 'Lower-case letters, digits and underscores, such as openrouter_credits';
    const factor = values.usdFactor.trim();
    if (!isDecimal(factor) || isZero(factor) || places(factor) > 8) found.usdFactor = 'More than zero, with up to 8 decimal places, such as 1';
    const ids = values.generationIds.split(/[\s,]+/).filter(Boolean);
    if (ids.length === 0 || ids.some((id) => !GENERATION.test(id))) found.generationIds = 'List the generation ids (gen-...) the verification rests on, separated by spaces';
    if (values.evidence.trim().length < 10) found.evidence = 'Say how it was verified (at least 10 characters). A verification without evidence is not recorded.';
    setProblems(found);
    if (Object.keys(found).length === 0 && target) setConfirm({ modelId: target, costUnit: values.costUnit.trim(), usdFactor: factor, evidence: values.evidence.trim(), generationIds: ids });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider cost verification, per model</CardTitle>
        <CardDescription>
          The provider’s cost is <strong>not assumed to be US dollars</strong>. A model’s cost counts as USD only after it is verified here, with evidence and generation ids. One model’s verification says nothing about another: every other model stays unverified.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <ul className="divide-y divide-border rounded-md border border-border" aria-label="Models">
          {data.models.map((model) => (
            <li key={model.modelId} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm">{model.modelId}</p>
                  <p className="text-xs text-muted-foreground">{model.displayName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {model.verification ? (
                    <Badge variant="success" className="gap-1.5">
                      <ShieldCheck className="size-3.5" aria-hidden /> Verified: 1 {model.verification.costUnit} = {model.verification.usdFactor} USD
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1.5">
                      <ShieldQuestion className="size-3.5" aria-hidden /> Unverified
                    </Badge>
                  )}
                  {canWrite && !model.verification && (
                    <Button type="button" size="sm" variant="outline" onClick={() => open(model.modelId)}>
                      Verify {model.modelId}
                    </Button>
                  )}
                  {canWrite && model.verification && (
                    <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={() => { revoke.reset(); setRevoking({ id: model.verification!.id, modelId: model.modelId, reason: '' }); }}>
                      Revoke {model.modelId}
                    </Button>
                  )}
                </div>
              </div>
              {model.verification && (
                <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Verified</dt>
                  <dd>{formatWhen(model.verification.verifiedAt)}</dd>
                  <dt className="text-muted-foreground">Generations</dt>
                  <dd className="break-all font-mono">{model.verification.generationIds.join(', ')}</dd>
                  <dt className="text-muted-foreground">Evidence</dt>
                  <dd className="whitespace-pre-wrap break-words">{model.verification.evidence}</dd>
                </dl>
              )}
            </li>
          ))}
        </ul>
        {data.history.some((row) => row.status === 'revoked') && <p className="text-xs text-muted-foreground">{data.history.filter((row) => row.status === 'revoked').length} earlier verification(s) were revoked; they stay in the history.</p>}
      </CardContent>

      {target && !confirm && (
        <Dialog open onOpenChange={(next) => (next ? undefined : setTarget(null))}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Verify {target}</DialogTitle>
              <DialogDescription>Only this model is verified. Record it only after comparing the response’s cost with OpenRouter’s own generation record and the account usage.</DialogDescription>
            </DialogHeader>
            <form className="space-y-3" noValidate onSubmit={(event) => { event.preventDefault(); review(); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mv-unit">Unit the provider reports</Label>
                  <Input id="mv-unit" value={values.costUnit} placeholder="e.g. openrouter_credits" autoComplete="off" onChange={(event) => setValues({ ...values, costUnit: event.target.value })} />
                  <Problem>{problems.costUnit}</Problem>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mv-factor">USD per one unit</Label>
                  <Input id="mv-factor" value={values.usdFactor} placeholder="e.g. 1" inputMode="decimal" autoComplete="off" onChange={(event) => setValues({ ...values, usdFactor: event.target.value })} />
                  <Problem>{problems.usdFactor}</Problem>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mv-gens">Generation ids</Label>
                <Input id="mv-gens" value={values.generationIds} placeholder="e.g. gen-1234567890-AbCd" autoComplete="off" onChange={(event) => setValues({ ...values, generationIds: event.target.value })} />
                <Problem>{problems.generationIds}</Problem>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mv-evidence">How it was verified</Label>
                <Textarea id="mv-evidence" rows={4} value={values.evidence} placeholder="e.g. the response cost, the generation record and the account usage change agreed for two requests" onChange={(event) => setValues({ ...values, evidence: event.target.value })} />
                <Problem>{problems.evidence}</Problem>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit">Review</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(next) => (next || verify.isPending ? undefined : setConfirm(null))}
          title={`Verify ${confirm.modelId} as USD?`}
          description="From now on this model’s cost, in this unit, is treated as USD at this factor. Every other model stays unverified. A wrong factor misstates every figure: record it only if you checked it."
          confirmLabel="Record verification"
          isPending={verify.isPending}
          onConfirm={() => verify.mutate(confirm, { onSuccess: () => { setConfirm(null); setTarget(null); setNotice({ message: `${confirm.modelId} is verified.`, tone: 'success' }); } })}
        >
          <div className="space-y-1 text-sm">
            <p className="font-mono text-xs">
              1 {confirm.costUnit} = {confirm.usdFactor} USD · {confirm.generationIds.join(', ')}
            </p>
            {verify.error ? <Problem>{apiErrorMessage(verify.error, 'The verification could not be recorded.')}</Problem> : null}
          </div>
        </ConfirmDialog>
      )}

      {revoking && (
        <ConfirmDialog
          open
          onOpenChange={(next) => (next || revoke.isPending ? undefined : setRevoking(null))}
          title={`Revoke the verification of ${revoking.modelId}?`}
          description="Its cost becomes unverified again and nothing is billed from it until it is verified again. The record stays in the history."
          confirmLabel="Revoke"
          destructive
          isPending={revoke.isPending}
          onConfirm={() => {
            if (revoking.reason.trim().length < 3) return;
            revoke.mutate({ id: revoking.id, reason: revoking.reason.trim() }, { onSuccess: () => { setRevoking(null); setNotice({ message: 'The verification was revoked.', tone: 'success' }); } });
          }}
        >
          <div className="space-y-1.5 text-sm">
            <Label htmlFor="mv-reason">Reason</Label>
            <Input id="mv-reason" value={revoking.reason} autoComplete="off" onChange={(event) => setRevoking({ ...revoking, reason: event.target.value })} />
            {revoking.reason.trim().length > 0 && revoking.reason.trim().length < 3 && <Problem>At least 3 characters</Problem>}
            {revoke.error ? <Problem>{apiErrorMessage(revoke.error, 'The verification could not be revoked.')}</Problem> : null}
          </div>
        </ConfirmDialog>
      )}
    </Card>
  );
}
