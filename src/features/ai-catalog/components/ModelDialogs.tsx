import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/apiError';
import { formatPrice, pricesEqual } from '../format';
import { CAPABILITIES, CAPABILITY_LABELS, createModelSchema, fieldErrors, pricingSchema, updateModelSchema } from '../schemas';
import type { AiModel, AiProvider, CreateModelInput, ModelCapability, SetPricingInput, UpdateModelInput } from '../types';

function Problem({ children }: { children?: string | undefined }) {
  return children ? (
    <p role="alert" className="text-xs text-destructive">
      {children}
    </p>
  ) : null;
}

/** Adds a model to a provider, or edits its display name, description, context window and capabilities. */
export function ModelFormDialog({
  open,
  onOpenChange,
  editing,
  providers,
  defaultProviderId,
  isPending,
  error,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AiModel | null;
  providers: AiProvider[];
  defaultProviderId: string | null;
  isPending: boolean;
  error: unknown;
  onCreate: (input: CreateModelInput) => void;
  onUpdate: (id: string, input: UpdateModelInput) => void;
}) {
  const blank = { providerId: defaultProviderId ?? '', modelId: '', displayName: '', description: '', contextWindow: '', capabilities: ['chat'] as ModelCapability[] };
  const [values, setValues] = useState(blank);
  const [problems, setProblems] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setProblems({});
    setValues(
      editing
        ? { providerId: editing.providerId, modelId: editing.modelId, displayName: editing.displayName, description: editing.description, contextWindow: editing.contextWindow === null ? '' : String(editing.contextWindow), capabilities: editing.capabilities }
        : { providerId: defaultProviderId ?? '', modelId: '', displayName: '', description: '', contextWindow: '', capabilities: ['chat'] },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens or the row changes
  }, [open, editing]);

  const toggle = (capability: ModelCapability) =>
    setValues((current) => ({ ...current, capabilities: current.capabilities.includes(capability) ? current.capabilities.filter((entry) => entry !== capability) : [...current.capabilities, capability] }));

  const submit = () => {
    if (editing) {
      const parsed = updateModelSchema.safeParse(values);
      if (!parsed.success) return setProblems(fieldErrors(parsed.error));
      setProblems({});
      onUpdate(editing.id, {
        displayName: parsed.data.displayName,
        description: parsed.data.description,
        contextWindow: parsed.data.contextWindow === '' ? null : Number(parsed.data.contextWindow),
        capabilities: parsed.data.capabilities,
      });
      return;
    }
    const parsed = createModelSchema.safeParse(values);
    if (!parsed.success) return setProblems(fieldErrors(parsed.error));
    setProblems({});
    onCreate({
      providerId: parsed.data.providerId,
      modelId: parsed.data.modelId,
      displayName: parsed.data.displayName,
      ...(parsed.data.description ? { description: parsed.data.description } : {}),
      ...(parsed.data.contextWindow === '' ? {} : { contextWindow: Number(parsed.data.contextWindow) }),
      capabilities: parsed.data.capabilities,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.displayName}` : 'Add a model'}</DialogTitle>
          <DialogDescription>
            {editing ? 'The provider’s model id cannot change.' : 'It starts switched off, without prices and unverified. Enter the model id exactly as the provider names it.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="model-provider">Provider</Label>
            <Select value={values.providerId} disabled={Boolean(editing)} onValueChange={(value) => setValues((current) => ({ ...current, providerId: value }))}>
              <SelectTrigger id="model-provider" aria-label="Provider">
                <SelectValue placeholder="Choose a provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name} ({provider.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Problem>{problems.providerId}</Problem>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model-id">Model id</Label>
            <Input id="model-id" value={values.modelId} disabled={Boolean(editing)} maxLength={120} autoComplete="off" spellCheck={false} onChange={(event) => setValues((current) => ({ ...current, modelId: event.target.value }))} />
            <Problem>{problems.modelId}</Problem>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model-name">Display name</Label>
            <Input id="model-name" value={values.displayName} maxLength={100} onChange={(event) => setValues((current) => ({ ...current, displayName: event.target.value }))} />
            <Problem>{problems.displayName}</Problem>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model-description">Description</Label>
            <Textarea id="model-description" rows={2} value={values.description} maxLength={500} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} />
            <Problem>{problems.description}</Problem>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model-context">Context window (tokens, optional)</Label>
            <Input id="model-context" value={values.contextWindow} inputMode="numeric" onChange={(event) => setValues((current) => ({ ...current, contextWindow: event.target.value }))} />
            <p className="text-xs text-muted-foreground">Only a figure taken from the provider’s documentation. Leave it empty if you have not checked it.</p>
            <Problem>{problems.contextWindow}</Problem>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-foreground">Capabilities</legend>
            <div className="flex flex-wrap gap-4">
              {CAPABILITIES.map((capability) => (
                <label key={capability} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" className="size-4 rounded border-input" checked={values.capabilities.includes(capability)} onChange={() => toggle(capability)} />
                  {CAPABILITY_LABELS[capability]}
                </label>
              ))}
            </div>
            <Problem>{problems.capabilities}</Problem>
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(error, 'The model could not be saved.')}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : editing ? 'Save changes' : 'Add model'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PriceChange {
  label: string;
  from: string;
  to: string;
}

/**
 * What the provider charges per million tokens. Nothing is pre-filled except what the API already holds. Saving shows what
 * changes (old to new) and asks again, because every later calculation starts from these figures.
 */
export function PricingDialog({
  open,
  onOpenChange,
  model,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: AiModel | null;
  isPending: boolean;
  error: unknown;
  onSubmit: (id: string, input: SetPricingInput) => void;
}) {
  const [values, setValues] = useState({ inputPerMillion: '', outputPerMillion: '', cachedInputPerMillion: '', currency: 'USD', note: '' });
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [review, setReview] = useState<{ input: SetPricingInput; changes: PriceChange[] } | null>(null);

  useEffect(() => {
    if (!open || !model) return;
    setProblems({});
    setReview(null);
    setValues({
      inputPerMillion: model.pricing.inputPerMillion === null ? '' : formatPrice(model.pricing.inputPerMillion),
      outputPerMillion: model.pricing.outputPerMillion === null ? '' : formatPrice(model.pricing.outputPerMillion),
      cachedInputPerMillion: model.pricing.cachedInputPerMillion === null ? '' : formatPrice(model.pricing.cachedInputPerMillion),
      currency: model.pricing.currency,
      note: model.pricing.note ?? '',
    });
  }, [open, model]);

  if (!model) return null;

  const prepare = () => {
    const parsed = pricingSchema.safeParse(values);
    if (!parsed.success) return setProblems(fieldErrors(parsed.error));
    setProblems({});
    const input: SetPricingInput = {
      inputPerMillion: parsed.data.inputPerMillion,
      outputPerMillion: parsed.data.outputPerMillion,
      cachedInputPerMillion: parsed.data.cachedInputPerMillion === '' ? null : parsed.data.cachedInputPerMillion,
      currency: parsed.data.currency,
      note: parsed.data.note === '' ? null : parsed.data.note,
    };
    const changes: PriceChange[] = [];
    const compare = (label: string, before: string | null, after: string | null) => {
      if (!pricesEqual(before, after)) changes.push({ label, from: before === null ? 'not set' : formatPrice(before), to: after === null ? 'not set' : formatPrice(after) });
    };
    compare('Input', model.pricing.inputPerMillion, input.inputPerMillion);
    compare('Output', model.pricing.outputPerMillion, input.outputPerMillion);
    compare('Cached input', model.pricing.cachedInputPerMillion, input.cachedInputPerMillion);
    if (model.pricing.currency !== input.currency) changes.push({ label: 'Currency', from: model.pricing.currency, to: input.currency });
    if ((model.pricing.note ?? null) !== input.note) changes.push({ label: 'Note', from: model.pricing.note ?? 'none', to: input.note ?? 'none' });
    setReview({ input, changes });
  };

  const field = (key: keyof typeof values, label: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`price-${key}`}>{label}</Label>
      <Input id={`price-${key}`} value={values[key]} inputMode={key === 'currency' || key === 'note' ? 'text' : 'decimal'} autoComplete="off" onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} />
      {hint && !problems[key] && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Problem>{problems[key]}</Problem>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Prices for {model.displayName}</DialogTitle>
          <DialogDescription>
            What {model.providerSlug} charges per 1,000,000 tokens, from its published price list. Up to 8 decimal places. Nothing is filled in for you.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (review) onSubmit(model.id, review.input);
            else prepare();
          }}
        >
          {review ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-foreground">{review.changes.length === 0 ? 'Nothing changes. Save anyway?' : 'These figures will change:'}</p>
              {review.changes.length > 0 && (
                <ul className="space-y-1 rounded-md border border-border p-3">
                  {review.changes.map((change) => (
                    <li key={change.label} className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">{change.label}</span>
                      <span className="font-mono text-foreground">
                        {change.from} → {change.to}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">The change is recorded in the audit log with the old and new figures.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {field('inputPerMillion', 'Input price')}
                {field('outputPerMillion', 'Output price')}
                {field('cachedInputPerMillion', 'Cached input price (optional)', 'Only if the model has a cheaper rate for cached input.')}
                {field('currency', 'Currency', 'Three letters, for example USD.')}
              </div>
              {field('note', 'Where the price came from (optional)', 'For example a link and the date you read it.')}
            </>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(error, 'The prices could not be saved.')}
            </p>
          ) : null}
          <DialogFooter>
            {review ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setReview(null)}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : review ? 'Confirm and save' : 'Review change'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
