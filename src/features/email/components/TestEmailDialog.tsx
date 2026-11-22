import { CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiErrorMessage } from '@/lib/apiError';
import { useSendTest } from '../hooks';
import { errorCodeLabel } from '../lib/status';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends the template once, with its own sample data, to one address. The message is marked TEST by the API; no code or link is real and
 * nothing is issued. Says how the attempt went, because it is not retried.
 */
export function TestEmailDialog({ open, onOpenChange, templateKey, hasDraft }: { open: boolean; onOpenChange: (open: boolean) => void; templateKey: string; hasDraft: boolean }) {
  const [to, setTo] = useState('');
  const [useDraft, setUseDraft] = useState(hasDraft);
  const send = useSendTest(templateKey);
  const valid = EMAIL.test(to.trim());
  const result = send.data;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) send.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send a test email</DialogTitle>
          <DialogDescription>Sent once, with made-up sample data, and clearly marked TEST. No real code or link is created, and nobody is signed in or reset.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) send.mutate({ to: to.trim(), useDraft: useDraft && hasDraft });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="test-to">Send to</Label>
            <Input id="test-to" type="email" autoComplete="off" value={to} onChange={(event) => setTo(event.target.value)} placeholder="you@example.com" maxLength={254} autoFocus />
          </div>
          {hasDraft ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <Label htmlFor="test-draft" className="text-sm font-normal">
                Use the saved draft (otherwise the published version)
              </Label>
              <Switch id="test-draft" checked={useDraft} onCheckedChange={setUseDraft} />
            </div>
          ) : null}

          <div role="status" aria-live="polite" className="text-sm">
            {send.isPending ? <p className="text-muted-foreground">Sending…</p> : null}
            {send.isError ? (
              <p className="flex items-start gap-2 text-destructive">
                <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {apiErrorMessage(send.error, 'The test email could not be sent.')}
              </p>
            ) : null}
            {result?.status === 'sent' ? (
              <p className="flex items-start gap-2 text-success">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                The test email was accepted by the mail server. Check the inbox for “[TEST]”.
              </p>
            ) : null}
            {result && result.status !== 'sent' ? (
              <p className="flex items-start gap-2 text-destructive">
                <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                It was not sent{result.errorCode ? `: ${errorCodeLabel(result.errorCode)}` : '.'}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={!valid || send.isPending}>
              {send.isPending ? 'Sending…' : result ? 'Send again' : 'Send test'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
