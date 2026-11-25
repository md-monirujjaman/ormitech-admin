import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/apiError';
import { CAPABILITIES, CAPABILITY_LABELS, createModelSchema, fieldErrors, updateModelSchema } from '../schemas';
import type { AiModel, CreateModelInput, ModelCapability, UpdateModelInput } from '../types';

function Problem({ children }: { children?: string | undefined }) {
  return children ? (
    <p role="alert" className="text-xs text-destructive">
      {children}
    </p>
  ) : null;
}

/** Adds a model to the list, or edits its display name, description, context window and capabilities. */
export function ModelFormDialog({
  open,
  onOpenChange,
  editing,
  isPending,
  error,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AiModel | null;
  isPending: boolean;
  error: unknown;
  onCreate: (input: CreateModelInput) => void;
  onUpdate: (id: string, input: UpdateModelInput) => void;
}) {
  const blank = { modelId: '', displayName: '', description: '', contextWindow: '', capabilities: ['chat'] as ModelCapability[] };
  const [values, setValues] = useState(blank);
  const [problems, setProblems] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setProblems({});
    setValues(
      editing
        ? { modelId: editing.modelId, displayName: editing.displayName, description: editing.description, contextWindow: editing.contextWindow === null ? '' : String(editing.contextWindow), capabilities: editing.capabilities }
        : { modelId: '', displayName: '', description: '', contextWindow: '', capabilities: ['chat'] },
    );
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
            {editing ? 'The model id cannot change.' : 'It starts switched off, without prices and unverified. Enter the model id exactly as OpenRouter names it, for example vendor/model-name.'}
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
            <Label htmlFor="model-id">Model id</Label>
            <Input id="model-id" value={values.modelId} placeholder="author/model-name" disabled={Boolean(editing)} maxLength={120} autoComplete="off" spellCheck={false} onChange={(event) => setValues((current) => ({ ...current, modelId: event.target.value }))} />
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
            <p className="text-xs text-muted-foreground">Only a figure taken from OpenRouter’s model page. Leave it empty if you have not checked it.</p>
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
