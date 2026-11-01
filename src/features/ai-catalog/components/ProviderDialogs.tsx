import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiErrorMessage } from '@/lib/apiError';
import { credentialsSchema, createProviderSchema, fieldErrors, updateProviderSchema } from '../schemas';
import type { AiProvider, CreateProviderInput, UpdateProviderInput } from '../types';

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string | undefined; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/** Creates a provider (with an optional key), or edits its name, address and priority. A key is never edited here. */
export function ProviderFormDialog({
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
  editing: AiProvider | null;
  isPending: boolean;
  error: unknown;
  onCreate: (input: CreateProviderInput) => void;
  onUpdate: (id: string, input: UpdateProviderInput) => void;
}) {
  const [values, setValues] = useState({ slug: '', name: '', baseUrl: DEFAULT_BASE_URL, priority: '100', apiKey: '' });
  const [problems, setProblems] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setProblems({});
    setValues(editing ? { slug: editing.slug, name: editing.name, baseUrl: editing.baseUrl, priority: String(editing.priority), apiKey: '' } : { slug: '', name: '', baseUrl: DEFAULT_BASE_URL, priority: '100', apiKey: '' });
    // Whatever was typed into the key field is dropped when the dialog closes.
    return () => setValues((current) => ({ ...current, apiKey: '' }));
  }, [open, editing]);

  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const submit = () => {
    const priority = values.priority.trim() === '' ? Number.NaN : Number(values.priority);
    if (editing) {
      const parsed = updateProviderSchema.safeParse({ name: values.name, baseUrl: values.baseUrl, priority });
      if (!parsed.success) return setProblems(fieldErrors(parsed.error));
      setProblems({});
      onUpdate(editing.id, parsed.data);
      return;
    }
    const parsed = createProviderSchema.safeParse({ ...values, priority });
    if (!parsed.success) return setProblems(fieldErrors(parsed.error));
    setProblems({});
    onCreate({ slug: parsed.data.slug, name: parsed.data.name, baseUrl: parsed.data.baseUrl.replace(/\/+$/, ''), priority: parsed.data.priority, ...(parsed.data.apiKey ? { apiKey: parsed.data.apiKey } : {}) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add an AI provider'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Change how this provider is listed and where requests are sent.' : 'It stays switched off until it has a key and you turn it on.'}
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
          <Field id="provider-slug" label="Identifier" error={problems.slug} hint={editing ? 'The identifier never changes.' : 'Lower-case letters, digits and hyphens, for example openai-main.'}>
            <Input id="provider-slug" value={values.slug} disabled={Boolean(editing)} maxLength={40} autoComplete="off" onChange={(event) => set('slug', event.target.value)} />
          </Field>
          <Field id="provider-name" label="Name" error={problems.name}>
            <Input id="provider-name" value={values.name} maxLength={80} onChange={(event) => set('name', event.target.value)} />
          </Field>
          <Field id="provider-url" label="API address" error={problems.baseUrl} hint="https only. API keys are sent here, so it must be a public host name.">
            <Input id="provider-url" value={values.baseUrl} maxLength={200} inputMode="url" autoComplete="off" onChange={(event) => set('baseUrl', event.target.value)} />
          </Field>
          <Field id="provider-priority" label="Priority" error={problems.priority} hint="Lower numbers are tried first.">
            <Input id="provider-priority" value={values.priority} inputMode="numeric" onChange={(event) => set('priority', event.target.value)} />
          </Field>
          {!editing && (
            <Field id="provider-key" label="API key (optional now)" error={problems.apiKey} hint="Stored encrypted and never shown again. You can add it later.">
              <Input id="provider-key" type="password" value={values.apiKey} autoComplete="new-password" spellCheck={false} onChange={(event) => set('apiKey', event.target.value)} />
            </Field>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(error, 'The provider could not be saved.')}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : editing ? 'Save changes' : 'Add provider'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sets or replaces a provider's API key. The current key is never shown: only the mask the API sends. Replacing one asks
 * for a second click, and the typed key is dropped as soon as the dialog closes.
 */
export function CredentialDialog({
  open,
  onOpenChange,
  provider,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: AiProvider | null;
  isPending: boolean;
  error: unknown;
  onSubmit: (id: string, apiKey: string) => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setApiKey('');
    setProblem(null);
    setConfirming(false);
    return () => setApiKey('');
  }, [open, provider?.id]);

  if (!provider) return null;
  const replacing = provider.credential.configured;

  const review = () => {
    const parsed = credentialsSchema.safeParse({ apiKey });
    if (!parsed.success) return setProblem(fieldErrors(parsed.error).apiKey ?? 'Enter a valid API key');
    setProblem(null);
    if (replacing) setConfirming(true);
    else onSubmit(provider.id, parsed.data.apiKey);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{replacing ? 'Replace the API key' : 'Set the API key'}</DialogTitle>
          <DialogDescription>
            {provider.name}.{' '}
            {replacing ? `The stored key ends in ${provider.credential.mask ?? 'a hidden value'}. It cannot be shown again.` : 'No key is stored yet.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (confirming) {
              const parsed = credentialsSchema.safeParse({ apiKey });
              if (parsed.success) onSubmit(provider.id, parsed.data.apiKey);
              return;
            }
            review();
          }}
        >
          {confirming ? (
            <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="font-medium text-foreground">Replace the key {provider.credential.mask ?? ''}?</p>
              <p className="text-muted-foreground">New requests to this provider use the new key at once. Its connection status is reset until you check it.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="credential-key">New API key</Label>
              <Input id="credential-key" type="password" value={apiKey} autoComplete="new-password" spellCheck={false} onChange={(event) => setApiKey(event.target.value)} />
              <p className="text-xs text-muted-foreground">Stored encrypted. It is never displayed again, only its last four characters.</p>
              {problem && (
                <p role="alert" className="text-xs text-destructive">
                  {problem}
                </p>
              )}
            </div>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(error, 'The key could not be saved.')}
            </p>
          ) : null}
          <DialogFooter>
            {confirming ? (
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirming(false)}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant={confirming ? 'destructive' : 'default'} disabled={isPending}>
              {isPending ? 'Saving…' : confirming ? 'Replace key' : replacing ? 'Continue' : 'Save key'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
