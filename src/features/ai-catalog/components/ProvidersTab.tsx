import { KeyRound, Pencil, Plus, RefreshCw, Server } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiErrorMessage } from '@/lib/apiError';
import { describeCheckError, formatWhen } from '../format';
import { useAiProviders, useCheckProvider, useCreateProvider, useSetDefaultProvider, useSetProviderCredentials, useSetProviderEnabled, useUpdateProvider } from '../hooks';
import type { AiProvider, UpdateProviderInput } from '../types';
import { LoadFailed } from './LoadFailed';
import { CredentialDialog, ProviderFormDialog } from './ProviderDialogs';
import { HealthBadge } from './StatusBadges';
import type { Notify } from './notice';

type Confirm = { kind: 'enable' | 'disable' | 'default'; provider: AiProvider } | { kind: 'address'; provider: AiProvider; input: UpdateProviderInput };

export function ProvidersTab({ canWrite, notify }: { canWrite: boolean; notify: Notify }) {
  const query = useAiProviders();
  const create = useCreateProvider();
  const update = useUpdateProvider();
  const setEnabled = useSetProviderEnabled();
  const setDefault = useSetDefaultProvider();
  const setCredentials = useSetProviderCredentials();
  const check = useCheckProvider();

  const [form, setForm] = useState<{ open: boolean; editing: AiProvider | null }>({ open: false, editing: null });
  const [keyFor, setKeyFor] = useState<AiProvider | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  if (query.isError) return <LoadFailed error={query.error} what="the AI providers" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data) return <Skeleton className="h-64 w-full" />;
  const providers = query.data;

  const openForm = (editing: AiProvider | null) => {
    create.reset();
    update.reset();
    setForm({ open: true, editing });
  };
  const closeForm = () => {
    setForm((current) => ({ ...current, open: false }));
    // A request that carried an API key is forgotten as soon as the dialog is gone, not when the page is left.
    create.reset();
    update.reset();
  };
  const closeKey = () => {
    setKeyFor(null);
    setCredentials.reset();
  };

  const runCheck = (provider: AiProvider) =>
    check.mutate(provider.id, {
      onSuccess: ({ check: result }) => {
        if (result.status === 'healthy') notify(`${provider.name} answered: the key works.`, 'success');
        else notify(`${provider.name}: ${describeCheckError(result.error) ?? 'the check failed.'}`, 'error');
      },
      onError: (error) => notify(apiErrorMessage(error, `${provider.name} could not be checked.`), 'error'),
    });

  const saveUpdate = (provider: AiProvider, input: UpdateProviderInput) =>
    update.mutate(
      { id: provider.id, input },
      {
        onSuccess: (saved) => {
          setConfirm(null);
          closeForm();
          notify(`${saved.name} was updated.`, 'success');
        },
      },
    );

  const requestUpdate = (id: string, input: UpdateProviderInput) => {
    const provider = providers.find((row) => row.id === id);
    if (!provider) return;
    // A new address switches the provider's models off until they are verified again: say so before doing it.
    if (input.baseUrl !== undefined && input.baseUrl.replace(/\/+$/, '') !== provider.baseUrl && provider.modelCount > 0) setConfirm({ kind: 'address', provider, input });
    else saveUpdate(provider, input);
  };

  const runConfirmed = () => {
    if (!confirm) return;
    const { provider } = confirm;
    if (confirm.kind === 'address') return saveUpdate(provider, confirm.input);
    const done = (message: string) => ({
      onSuccess: () => {
        setConfirm(null);
        notify(message, 'success');
      },
    });
    if (confirm.kind === 'default') return setDefault.mutate(provider.id, done(`${provider.name} is now the default provider.`));
    const enabled = confirm.kind === 'enable';
    setEnabled.mutate({ id: provider.id, enabled }, done(`${provider.name} was ${enabled ? 'enabled' : 'disabled'}.`));
  };

  const confirming = setEnabled.isPending || setDefault.isPending || update.isPending;
  const confirmError = confirm?.kind === 'default' ? setDefault.error : confirm?.kind === 'address' ? update.error : setEnabled.error;

  const confirmText: Record<Confirm['kind'], { title: string; description: string; label: string; destructive: boolean }> = {
    enable: { title: 'Enable this provider?', description: 'Workspaces whose plan is allowed one of its verified models will be answered through it.', label: 'Enable provider', destructive: false },
    disable: {
      title: 'Disable this provider?',
      description: 'Requests stop going to it and the platform’s default configuration answers instead. If it is the default provider, it stops being the default.',
      label: 'Disable provider',
      destructive: true,
    },
    default: { title: 'Make this the default provider?', description: 'It is tried before the other providers, whatever their priority.', label: 'Make default', destructive: false },
    address: {
      title: 'Change the API address?',
      description: 'Your API key will be sent to the new address. Every model of this provider is switched off until it is verified again.',
      label: 'Change address',
      destructive: true,
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Where AI requests are sent. Keys are stored encrypted and are never shown; only their last four characters are.</p>
        {canWrite && (
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus className="size-4" aria-hidden />
            Add provider
          </Button>
        )}
      </div>

      {providers.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No AI provider yet"
          description="Until one is added and switched on, replies use the server’s default configuration."
          action={
            canWrite ? (
              <Button size="sm" onClick={() => openForm(null)}>
                Add provider
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>API key</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead className="text-right">Priority</TableHead>
                <TableHead className="text-right">Models</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => {
                const checking = check.isPending && check.variables === provider.id;
                return (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{provider.name}</span>
                        {provider.isDefault && <Badge variant="default">Default</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {provider.slug} · {provider.type}
                      </div>
                      <div className="break-all font-mono text-xs text-muted-foreground">{provider.baseUrl}</div>
                    </TableCell>
                    <TableCell>
                      {provider.credential.configured ? (
                        <div>
                          <span className="font-mono text-sm text-foreground" aria-label="Masked API key">
                            {provider.credential.mask}
                          </span>
                          <div className="text-xs text-muted-foreground">Set {formatWhen(provider.credential.updatedAt)}</div>
                        </div>
                      ) : (
                        <Badge variant="outline">No key</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={provider.enabled}
                        disabled={!canWrite || (!provider.enabled && !provider.credential.configured)}
                        aria-label={`${provider.enabled ? 'Disable' : 'Enable'} ${provider.name}`}
                        title={!provider.enabled && !provider.credential.configured ? 'Add an API key first' : undefined}
                        onCheckedChange={(next) => {
                          setEnabled.reset();
                          setConfirm({ kind: next ? 'enable' : 'disable', provider });
                        }}
                      />
                      {canWrite && provider.enabled && !provider.isDefault && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => {
                            setDefault.reset();
                            setConfirm({ kind: 'default', provider });
                          }}
                        >
                          Make default
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <HealthBadge health={provider.health} />
                      {provider.health.error && <div className="mt-1 max-w-48 text-xs text-muted-foreground">{describeCheckError(provider.health.error)}</div>}
                      {provider.health.checkedAt && <div className="text-xs text-muted-foreground">{formatWhen(provider.health.checkedAt)}</div>}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{provider.priority}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{provider.modelCount}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {canWrite && (
                          <Button variant="outline" size="sm" disabled={checking || !provider.credential.configured} title={provider.credential.configured ? undefined : 'Add an API key first'} onClick={() => runCheck(provider)}>
                            <RefreshCw className={`size-4 ${checking ? 'animate-spin' : ''}`} aria-hidden />
                            {checking ? 'Checking…' : 'Check connection'}
                          </Button>
                        )}
                        {canWrite && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCredentials.reset();
                              setKeyFor(provider);
                            }}
                          >
                            <KeyRound className="size-4" aria-hidden />
                            {provider.credential.configured ? 'Replace key' : 'Set key'}
                          </Button>
                        )}
                        {canWrite && (
                          <Button variant="ghost" size="sm" aria-label={`Edit ${provider.name}`} onClick={() => openForm(provider)}>
                            <Pencil className="size-4" aria-hidden />
                            Edit
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <ProviderFormDialog
        open={form.open}
        onOpenChange={(open) => (open ? undefined : closeForm())}
        editing={form.editing}
        isPending={create.isPending || update.isPending}
        error={form.editing ? update.error : create.error}
        onCreate={(input) =>
          create.mutate(input, {
            onSuccess: (provider) => {
              closeForm();
              notify(`${provider.name} was added${provider.credential.configured ? '' : '. Add a key before you enable it'}.`, 'success');
            },
          })
        }
        onUpdate={requestUpdate}
      />

      <CredentialDialog
        open={keyFor !== null}
        onOpenChange={(open) => (open ? undefined : closeKey())}
        provider={keyFor ? (providers.find((row) => row.id === keyFor.id) ?? keyFor) : null}
        isPending={setCredentials.isPending}
        error={setCredentials.error}
        onSubmit={(id, apiKey) =>
          setCredentials.mutate(
            { id, apiKey },
            {
              onSuccess: (provider) => {
                closeKey();
                notify(`The key for ${provider.name} was saved (${provider.credential.mask}). Check the connection to confirm it works.`, 'success');
              },
            },
          )
        }
      />

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || confirming ? undefined : setConfirm(null))}
          title={confirmText[confirm.kind].title}
          description={`${confirm.provider.name}. ${confirmText[confirm.kind].description}`}
          confirmLabel={confirmText[confirm.kind].label}
          destructive={confirmText[confirm.kind].destructive}
          isPending={confirming}
          onConfirm={runConfirmed}
        >
          {confirmError ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(confirmError, 'The change was refused.')}
            </p>
          ) : null}
        </ConfirmDialog>
      )}
    </div>
  );
}
