import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiErrorMessage } from '@/lib/apiError';
import { newKey } from '@/features/ai-credits/idempotency';
import { useCreateInvoice, useIssueInvoice, useRecordPayment } from '../hooks';
import type { InvoiceLineInput } from '../types';

const AMOUNT = /^\d{1,10}(\.\d{1,2})?$/;
const RATE = /^\d(\.\d{1,4})?$/;
const blankLine = (): InvoiceLineInput & { quantityText: string } => ({ description: '', quantity: 1, unitAmount: '', quantityText: '1' });

function Problem({ children }: { children?: string }) {
  return children ? <p role="alert" className="text-xs text-destructive">{children}</p> : null;
}

/** A draft invoice for a workspace. The server computes every total from the lines; this form never does. */
export function NewInvoiceDialog({ organizations, onClose }: { organizations: Array<{ id: string; name: string }>; onClose: () => void }) {
  const create = useCreateInvoice();
  const [organizationId, setOrganizationId] = useState('');
  const [currency, setCurrency] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [discount, setDiscount] = useState('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState([blankLine()]);
  const [problem, setProblem] = useState('');

  const submit = () => {
    if (!organizationId) return setProblem('Choose the workspace.');
    if (!/^[A-Z]{3}$/.test(currency)) return setProblem('Currency is a three-letter code, for example USD.');
    if (taxRate && !RATE.test(taxRate)) return setProblem('Tax rate is a fraction with up to 4 decimals (0.05 is 5%). Leave it empty for none.');
    if (discount && !AMOUNT.test(discount)) return setProblem('Discount is an amount with up to two decimals.');
    if (reason.trim().length < 3) return setProblem('Say why this invoice is being made.');
    for (const line of lines) {
      if (!line.description.trim()) return setProblem('Every line needs a description.');
      if (!AMOUNT.test(line.unitAmount)) return setProblem('Every unit amount is an amount with up to two decimals.');
      if (!Number.isInteger(Number(line.quantityText)) || Number(line.quantityText) < 1) return setProblem('Quantity is a whole number, at least 1.');
    }
    setProblem('');
    create.mutate(
      { organizationId, currency, ...(taxRate ? { taxRate } : {}), ...(discount ? { discountAmount: discount } : {}), lines: lines.map((line) => ({ description: line.description.trim(), quantity: Number(line.quantityText), unitAmount: line.unitAmount })), reason: reason.trim() },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => (open || create.isPending ? undefined : onClose())}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>Starts as a draft the workspace cannot see. Totals are calculated by the server. An issued invoice never changes: a mistake is voided and made again.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-org">Workspace</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger id="inv-org" aria-label="Workspace"><SelectValue placeholder="Choose a workspace" /></SelectTrigger>
                <SelectContent>{organizations.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-currency">Currency</Label>
              <Input id="inv-currency" value={currency} placeholder="USD" onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-discount">Discount (optional)</Label>
              <Input id="inv-discount" value={discount} inputMode="decimal" onChange={(event) => setDiscount(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-tax">Tax rate (optional)</Label>
              <Input id="inv-tax" value={taxRate} inputMode="decimal" placeholder="0.05 is 5%" onChange={(event) => setTaxRate(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Lines</p>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_5rem_8rem_auto]">
                <Input aria-label={`Line ${index + 1} description`} placeholder="Description" value={line.description} onChange={(event) => setLines((all) => all.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)))} />
                <Input aria-label={`Line ${index + 1} quantity`} value={line.quantityText} inputMode="numeric" onChange={(event) => setLines((all) => all.map((item, i) => (i === index ? { ...item, quantityText: event.target.value } : item)))} />
                <Input aria-label={`Line ${index + 1} unit amount`} placeholder="0.00" value={line.unitAmount} inputMode="decimal" onChange={(event) => setLines((all) => all.map((item, i) => (i === index ? { ...item, unitAmount: event.target.value } : item)))} />
                <Button type="button" variant="ghost" size="sm" disabled={lines.length === 1} onClick={() => setLines((all) => all.filter((_, i) => i !== index))}>Remove</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" disabled={lines.length >= 50} onClick={() => setLines((all) => [...all, blankLine()])}>Add a line</Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-reason">Reason</Label>
            <Input id="inv-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <Problem>{problem || (create.error ? apiErrorMessage(create.error, 'The invoice could not be created.') : undefined)}</Problem>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create draft'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Issue a draft, or write down money that arrived outside the system (nothing is collected: there is no gateway). */
export function InvoiceActions({ invoice, onDone }: { invoice: { id: string; status: string; currency: string; number: string }; onDone: () => void }) {
  const issue = useIssueInvoice();
  const pay = useRecordPayment();
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [key, setKey] = useState(newKey);
  const [problem, setProblem] = useState('');

  if (invoice.status === 'DRAFT') {
    return (
      <div className="space-y-2">
        <Problem>{issue.error ? apiErrorMessage(issue.error, 'The invoice could not be issued.') : undefined}</Problem>
        <Button size="sm" disabled={issue.isPending} onClick={() => issue.mutate({ invoiceId: invoice.id }, { onSuccess: onDone })}>{issue.isPending ? 'Issuing…' : 'Issue invoice'}</Button>
      </div>
    );
  }
  if (invoice.status !== 'OPEN' && invoice.status !== 'UNCOLLECTIBLE') return null;

  const submit = () => {
    if (!AMOUNT.test(amount)) return setProblem('Enter the amount received, with up to two decimals.');
    if (reference.trim().length < 3) return setProblem('Enter where the money came from (a bank reference or receipt).');
    setProblem('');
    pay.mutate({ invoiceId: invoice.id, payment: { amount, currency: invoice.currency, reference: reference.trim(), idempotencyKey: key } }, { onSuccess: () => { setPaying(false); onDone(); } });
  };

  return (
    <div className="space-y-2">
      {!paying ? (
        <Button size="sm" variant="outline" onClick={() => { setKey(newKey()); setPaying(true); }}>Record a payment</Button>
      ) : (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Money received outside the system. Nothing is charged to anyone. Paying the invoice in full marks it paid.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="pay-amount">Amount ({invoice.currency})</Label>
              <Input id="pay-amount" value={amount} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-reference">Reference</Label>
              <Input id="pay-reference" value={reference} onChange={(event) => setReference(event.target.value)} />
            </div>
          </div>
          <Problem>{problem || (pay.error ? apiErrorMessage(pay.error, 'The payment could not be recorded.') : undefined)}</Problem>
          <div className="flex gap-2">
            <Button size="sm" disabled={pay.isPending} onClick={submit}>{pay.isPending ? 'Recording…' : 'Record payment'}</Button>
            <Button size="sm" variant="ghost" disabled={pay.isPending} onClick={() => setPaying(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
