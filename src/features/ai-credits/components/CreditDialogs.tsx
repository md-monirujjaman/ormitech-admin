import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/apiError';
import { formatCredits, SOURCE_LABEL } from '../format';
import { newKey } from '../idempotency';
import { adjustSchema, fieldErrors, grantSchema } from '../schemas';
import type { AdjustInput, CreditBucket, GrantInput } from '../types';

function Problem({ children }: { children?: string | undefined }) {
  return children ? (
    <p role="alert" className="text-xs text-destructive">
      {children}
    </p>
  ) : null;
}

/** A toLocal `datetime-local` value as an ISO time, or null when empty or in the past. */
const toIso = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Adds credit to a workspace as a new bucket. Asks again before it saves, because it creates money-like balance. */
export function GrantDialog({ open, onOpenChange, isPending, error, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; isPending: boolean; error: unknown; onSubmit: (input: GrantInput) => void }) {
  const [values, setValues] = useState({ source: 'admin_grant' as GrantInput['source'], amount: '', label: '', expiresAt: '', reason: '' });
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<GrantInput | null>(null);
  const [key, setKey] = useState(newKey);

  useEffect(() => {
    if (!open) return;
    setValues({ source: 'admin_grant', amount: '', label: '', expiresAt: '', reason: '' });
    setProblems({});
    setConfirming(null);
    setKey(newKey());
  }, [open]);

  const review = () => {
    const parsed = grantSchema.safeParse(values);
    if (!parsed.success) return setProblems(fieldErrors(parsed.error));
    const expiresAt = toIso(parsed.data.expiresAt);
    if (parsed.data.expiresAt && (!expiresAt || new Date(expiresAt) <= new Date())) return setProblems({ expiresAt: 'The expiry must be in the future' });
    setProblems({});
    setConfirming({ source: parsed.data.source, amount: parsed.data.amount, ...(parsed.data.label ? { label: parsed.data.label } : {}), ...(expiresAt ? { expiresAt } : {}), reason: parsed.data.reason, idempotencyKey: key });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Grant credits</DialogTitle>
          <DialogDescription>Adds a new bucket of credit to this workspace. It appears in the ledger under your name, with the reason.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (confirming) onSubmit(confirming);
            else review();
          }}
        >
          {confirming ? (
            <div className="space-y-2 rounded-md border border-border p-3 text-sm">
              <p className="font-medium text-foreground">Add {formatCredits(confirming.amount)} credits ({SOURCE_LABEL[confirming.source]})?</p>
              {confirming.expiresAt && <p className="text-muted-foreground">They expire on {new Date(confirming.expiresAt).toLocaleString()}.</p>}
              <p className="text-muted-foreground">Reason: {confirming.reason}</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="grant-source">Source</Label>
                <Select value={values.source} onValueChange={(value) => setValues((current) => ({ ...current, source: value as GrantInput['source'] }))}>
                  <SelectTrigger id="grant-source" aria-label="Source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_grant">{SOURCE_LABEL.admin_grant}</SelectItem>
                    <SelectItem value="plan_included">{SOURCE_LABEL.plan_included}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Purchased credit comes from a payment, not from here.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grant-amount">Credits</Label>
                <Input id="grant-amount" inputMode="decimal" autoComplete="off" value={values.amount} onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))} />
                <Problem>{problems.amount}</Problem>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grant-label">Label (optional)</Label>
                <Input id="grant-label" value={values.label} maxLength={120} onChange={(event) => setValues((current) => ({ ...current, label: event.target.value }))} />
                <Problem>{problems.label}</Problem>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grant-expires">Expires (optional)</Label>
                <Input id="grant-expires" type="datetime-local" value={values.expiresAt} onChange={(event) => setValues((current) => ({ ...current, expiresAt: event.target.value }))} />
                <Problem>{problems.expiresAt}</Problem>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grant-reason">Reason</Label>
                <Textarea id="grant-reason" rows={2} value={values.reason} maxLength={500} onChange={(event) => setValues((current) => ({ ...current, reason: event.target.value }))} />
                <Problem>{problems.reason}</Problem>
              </div>
            </>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(error, 'The credits could not be granted.')}
            </p>
          ) : null}
          <DialogFooter>
            {confirming ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirming(null)}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : confirming ? 'Grant credits' : 'Review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Adds or removes credit in one bucket. Removing needs that much credit in it; the API refuses anything that would go below zero. */
export function AdjustDialog({
  open,
  onOpenChange,
  bucket,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: CreditBucket | null;
  isPending: boolean;
  error: unknown;
  onSubmit: (input: AdjustInput) => void;
}) {
  const [values, setValues] = useState({ amount: '', reason: '' });
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<AdjustInput | null>(null);
  const [key, setKey] = useState(newKey);

  useEffect(() => {
    if (!open) return;
    setValues({ amount: '', reason: '' });
    setProblems({});
    setConfirming(null);
    setKey(newKey());
  }, [open, bucket?.id]);

  if (!bucket) return null;

  const review = () => {
    const parsed = adjustSchema.safeParse({ bucketId: bucket.id, ...values });
    if (!parsed.success) return setProblems(fieldErrors(parsed.error));
    setProblems({});
    setConfirming({ bucketId: bucket.id, amount: parsed.data.amount, reason: parsed.data.reason, idempotencyKey: key });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust a bucket</DialogTitle>
          <DialogDescription>
            {SOURCE_LABEL[bucket.source]}
            {bucket.label ? ` (${bucket.label})` : ''}: {formatCredits(bucket.balance)} credits, {formatCredits(bucket.available)} free.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (confirming) onSubmit(confirming);
            else review();
          }}
        >
          {confirming ? (
            <div className="space-y-2 rounded-md border border-border p-3 text-sm">
              <p className="font-medium text-foreground">
                {confirming.amount.startsWith('-') ? 'Take' : 'Add'} {formatCredits(confirming.amount.replace('-', ''))} credits {confirming.amount.startsWith('-') ? 'from' : 'to'} this bucket?
              </p>
              <p className="text-muted-foreground">Reason: {confirming.reason}</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="adjust-amount">Credits (a minus takes credit away)</Label>
                <Input id="adjust-amount" inputMode="decimal" autoComplete="off" value={values.amount} onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))} />
                <Problem>{problems.amount}</Problem>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adjust-reason">Reason</Label>
                <Textarea id="adjust-reason" rows={2} value={values.reason} maxLength={500} onChange={(event) => setValues((current) => ({ ...current, reason: event.target.value }))} />
                <Problem>{problems.reason}</Problem>
              </div>
            </>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(error, 'The adjustment could not be made.')}
            </p>
          ) : null}
          <DialogFooter>
            {confirming ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirming(null)}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant={confirming?.amount.startsWith('-') ? 'destructive' : 'default'} disabled={isPending}>
              {isPending ? 'Saving…' : confirming ? 'Make the adjustment' : 'Review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
