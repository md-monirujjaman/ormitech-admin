import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LimitValue } from '@/types/entitlements';

/**
 * Editor for a single limit. The three states are separate choices in the UI because they're separate states in
 * the model — "unlimited" is never expressed as a very large number, and "disabled" is never expressed as 0.
 */
export function LimitField({
  value,
  onChange,
  disabled = false,
  id,
}: {
  value: LimitValue;
  onChange: (next: LimitValue) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={value.kind}
        disabled={disabled}
        onValueChange={(kind) => {
          if (kind === 'limited') {
            onChange({ kind: 'limited', value: value.kind === 'limited' ? value.value : 0 });
          } else if (kind === 'unlimited') {
            onChange({ kind: 'unlimited' });
          } else {
            onChange({ kind: 'disabled' });
          }
        }}
      >
        <SelectTrigger id={id} className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="disabled">Disabled</SelectItem>
          <SelectItem value="limited">Limited</SelectItem>
          <SelectItem value="unlimited">Unlimited</SelectItem>
        </SelectContent>
      </Select>

      {value.kind === 'limited' && (
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          disabled={disabled}
          className="w-32"
          value={value.value}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            onChange({ kind: 'limited', value: Number.isNaN(next) || next < 0 ? 0 : next });
          }}
          aria-label="Limit amount"
        />
      )}
    </div>
  );
}
