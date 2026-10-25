import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiErrorMessage } from '@/lib/apiError';
import type { PricingBilling, PricingCurrency, UpdateSettingsInput } from '../types';

interface Row {
  id: string;
  label: string;
  symbol: string;
  rate: string;
  round: string;
}

const toRows = (currencies: PricingCurrency[]): Row[] => currencies.map((c) => ({ id: c.id, label: c.label, symbol: c.symbol, rate: String(c.rate), round: String(c.round) }));

/** How prices are written across the whole page: the yearly discount and the currencies visitors can switch between. */
export function BillingSettingsDialog({
  open,
  onOpenChange,
  billing,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billing: PricingBilling;
  isPending: boolean;
  error: unknown;
  onSubmit: (input: UpdateSettingsInput) => void;
}) {
  const [annual, setAnnual] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (open) {
      setAnnual(String(billing.annualDiscountPercent));
      setRows(toRows(billing.currencies));
    }
  }, [open, billing]);

  const update = (index: number, patch: Partial<Row>) => setRows(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  const valid = rows.length > 0 && rows.every((row) => /^[a-z]{2,6}$/.test(row.id) && row.label.trim() && row.symbol.trim() && Number(row.rate) > 0 && Number(row.round) > 0) && Number(annual) >= 0 && Number(annual) <= 90;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Billing settings</DialogTitle>
          <DialogDescription>These apply to every card on the pricing page.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            onSubmit({
              annualDiscountPercent: Number(annual),
              currencySymbol: rows[0]?.symbol.trim() ?? '$',
              currencies: rows.map((row) => ({ id: row.id, label: row.label.trim(), symbol: row.symbol.trim(), rate: Number(row.rate), round: Number(row.round) })),
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="annual-discount">Yearly billing discount (%)</Label>
            <Input id="annual-discount" type="number" min={0} max={90} step="1" value={annual} className="max-w-40" onChange={(e) => setAnnual(e.target.value)} />
            <p className="text-xs text-muted-foreground">Shown as “Save X%” next to the Monthly / Annual switch. 0 hides it.</p>
          </div>

          <div className="space-y-2">
            <Label>Currencies</Label>
            <p className="text-xs text-muted-foreground">Prices are written in the first currency. The others are that price × the rate, rounded to the “round to” step (for example 10 rounds to the nearest 10).</p>
            <div className="grid grid-cols-[4rem_1fr_4rem_6rem_6rem_2rem] items-center gap-2 text-xs text-muted-foreground">
              <span>Code</span>
              <span>Name</span>
              <span>Symbol</span>
              <span>Rate</span>
              <span>Round to</span>
              <span />
            </div>
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[4rem_1fr_4rem_6rem_6rem_2rem] items-center gap-2">
                <Input value={row.id} maxLength={6} aria-label="Currency code" onChange={(e) => update(index, { id: e.target.value.toLowerCase() })} />
                <Input value={row.label} maxLength={8} aria-label="Currency name" onChange={(e) => update(index, { label: e.target.value })} />
                <Input value={row.symbol} maxLength={4} aria-label="Symbol" onChange={(e) => update(index, { symbol: e.target.value })} />
                <Input type="number" step="any" min={0} value={row.rate} disabled={index === 0} aria-label="Rate" onChange={(e) => update(index, { rate: e.target.value })} />
                <Input type="number" step="any" min={0} value={row.round} aria-label="Round to" onChange={(e) => update(index, { round: e.target.value })} />
                <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Remove currency" disabled={index === 0} onClick={() => setRows(rows.filter((_, at) => at !== index))}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" disabled={rows.length >= 6} onClick={() => setRows([...rows, { id: '', label: '', symbol: '', rate: '1', round: '1' }])}>
              <Plus className="size-4" aria-hidden />
              Add a currency
            </Button>
          </div>

          {error != null && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{apiErrorMessage(error, 'The OrmiTech API refused the change.')}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !valid}>
              {isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
