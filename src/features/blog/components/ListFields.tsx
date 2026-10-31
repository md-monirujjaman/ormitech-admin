import { Plus, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { BlogFaqItem } from '../types';

/** Type and press Enter (or comma) to add; click a chip's × to remove. Used for tags and keywords. */
export function ChipInput({ id, label, values, onChange, placeholder, max, disabled }: { id: string; label: string; values: string[]; onChange: (next: string[]) => void; placeholder: string; max: number; disabled?: boolean }) {
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...values];
    for (const part of parts) if (next.length < max && !next.some((existing) => existing.toLowerCase() === part.toLowerCase())) next.push(part);
    onChange(next);
    setText('');
  };
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(text);
    } else if (event.key === 'Backspace' && text === '' && values.length > 0) onChange(values.slice(0, -1));
  };
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Badge key={value} variant="secondary" className="gap-1 pr-1">
            {value}
            {!disabled && (
              <button type="button" aria-label={`Remove ${value}`} className="rounded-full p-0.5 hover:bg-foreground/10" onClick={() => onChange(values.filter((entry) => entry !== value))}>
                <X className="size-3" aria-hidden />
              </button>
            )}
          </Badge>
        ))}
      </div>
      <Input id={id} className="mt-2" value={text} placeholder={values.length >= max ? `Up to ${max}` : placeholder} disabled={disabled || values.length >= max} onChange={(event) => setText(event.target.value)} onKeyDown={onKey} onBlur={() => add(text)} />
    </div>
  );
}

/** A list of short lines (key takeaways): add, edit, remove. */
export function LineList({ label, hint, values, onChange, placeholder, max, disabled }: { label: string; hint?: string; values: string[]; onChange: (next: string[]) => void; placeholder: string; max: number; disabled?: boolean }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <ul className="mt-2 space-y-2">
        {values.map((value, index) => (
          <li key={index} className="flex gap-2">
            <Input aria-label={`${label} ${index + 1}`} value={value} maxLength={300} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange(values.map((entry, at) => (at === index ? event.target.value : entry)))} />
            {!disabled && (
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} onClick={() => onChange(values.filter((_, at) => at !== index))}>
                <X className="size-4" aria-hidden />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!disabled && values.length < max && (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange([...values, ''])}>
          <Plus className="size-4" aria-hidden />
          Add
        </Button>
      )}
    </div>
  );
}

/** Questions and answers. They show on the article and are published as FAQ structured data. */
export function FaqEditor({ items, onChange, disabled }: { items: BlogFaqItem[]; onChange: (next: BlogFaqItem[]) => void; disabled?: boolean }) {
  const set = (index: number, patch: Partial<BlogFaqItem>) => onChange(items.map((item, at) => (at === index ? { ...item, ...patch } : item)));
  return (
    <div>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex gap-2">
              <Input aria-label={`Question ${index + 1}`} value={item.question} maxLength={250} disabled={disabled} placeholder="A question a customer would ask" onChange={(event) => set(index, { question: event.target.value })} />
              {!disabled && (
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove question ${index + 1}`} onClick={() => onChange(items.filter((_, at) => at !== index))}>
                  <X className="size-4" aria-hidden />
                </Button>
              )}
            </div>
            <Textarea aria-label={`Answer ${index + 1}`} value={item.answer} rows={3} maxLength={1200} disabled={disabled} placeholder="A plain, complete answer in one to three sentences" onChange={(event) => set(index, { answer: event.target.value })} />
          </li>
        ))}
      </ul>
      {!disabled && items.length < 20 && (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onChange([...items, { question: '', answer: '' }])}>
          <Plus className="size-4" aria-hidden />
          Add a question
        </Button>
      )}
    </div>
  );
}

export function Counter({ value, min, max }: { value: number; min?: number; max: number }) {
  const state = value === 0 ? 'text-muted-foreground' : value > max ? 'text-destructive' : min !== undefined && value < min ? 'text-warning' : 'text-success';
  return (
    <span className={`text-xs tabular-nums ${state}`}>
      {value}/{max}
    </span>
  );
}
