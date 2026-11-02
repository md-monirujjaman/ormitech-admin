import { BadgeCheck, CircleDollarSign, Pencil, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiErrorMessage } from '@/lib/apiError';
import { VERIFICATION_TEXT, formatPrice, pricesEqual } from '../format';
import { useAiModels, useAiProviders, useCreateModel, useSetDefaultModel, useSetModelEnabled, useSetModelPricing, useUpdateModel, useVerifyModel } from '../hooks';
import { CAPABILITY_LABELS } from '../schemas';
import type { AiModel } from '../types';
import { LoadFailed } from './LoadFailed';
import { ModelFormDialog, PricingDialog } from './ModelDialogs';
import { VerifiedBadge } from './StatusBadges';
import type { Notify } from './notice';

const ALL = 'all';
type Confirm = { kind: 'enable' | 'disable' | 'default'; model: AiModel };

export function ModelsTab({ canWrite, notify }: { canWrite: boolean; notify: Notify }) {
  const providersQuery = useAiProviders();
  const modelsQuery = useAiModels();
  const create = useCreateModel();
  const update = useUpdateModel();
  const setPricing = useSetModelPricing();
  const verify = useVerifyModel();
  const setEnabled = useSetModelEnabled();
  const setDefault = useSetDefaultModel();

  const [filter, setFilter] = useState(ALL);
  const [form, setForm] = useState<{ open: boolean; editing: AiModel | null }>({ open: false, editing: null });
  const [pricingFor, setPricingFor] = useState<AiModel | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const failure = modelsQuery.isError ? modelsQuery : providersQuery.isError ? providersQuery : null;
  if (failure) return <LoadFailed error={failure.error} what="the model catalogue" onRetry={() => void failure.refetch()} />;
  if (modelsQuery.isLoading || providersQuery.isLoading || !modelsQuery.data || !providersQuery.data) return <Skeleton className="h-64 w-full" />;

  const providers = providersQuery.data;
  const models = modelsQuery.data.filter((model) => filter === ALL || model.providerId === filter);
  const live = (model: AiModel) => modelsQuery.data.find((row) => row.id === model.id) ?? model;

  const openForm = (editing: AiModel | null) => {
    create.reset();
    update.reset();
    setForm({ open: true, editing });
  };
  const closeForm = () => setForm((current) => ({ ...current, open: false }));

  const runVerify = (model: AiModel) =>
    verify.mutate(model.id, {
      onSuccess: ({ verification }) => {
        const outcome = VERIFICATION_TEXT[verification.reason];
        notify(`${model.displayName}: ${outcome.text}`, outcome.tone);
      },
      onError: (error) => notify(apiErrorMessage(error, `${model.displayName} could not be verified.`), 'error'),
    });

  const runConfirmed = () => {
    if (!confirm) return;
    const { model } = confirm;
    const done = (message: string) => ({
      onSuccess: () => {
        setConfirm(null);
        notify(message, 'success');
      },
    });
    if (confirm.kind === 'default') return setDefault.mutate(model.id, done(`${model.displayName} is now the default model of ${model.providerSlug}.`));
    const enabled = confirm.kind === 'enable';
    setEnabled.mutate({ id: model.id, enabled }, done(`${model.displayName} was ${enabled ? 'enabled' : 'disabled'}.`));
  };

  const confirming = setEnabled.isPending || setDefault.isPending;
  const confirmError = confirm?.kind === 'default' ? setDefault.error : setEnabled.error;
  const ready = (model: AiModel) => model.pricing.inputPerMillion !== null && model.pricing.outputPerMillion !== null && model.availabilityVerifiedAt !== null && model.capabilities.includes('chat');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-56" aria-label="Filter by provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All providers</SelectItem>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">A model is offered only when it is priced, verified with the provider, enabled and allowed for the plan.</p>
        </div>
        {canWrite && (
          <Button size="sm" disabled={providers.length === 0} title={providers.length === 0 ? 'Add a provider first' : undefined} onClick={() => openForm(null)}>
            <Plus className="size-4" aria-hidden />
            Add model
          </Button>
        )}
      </div>

      {models.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={providers.length === 0 ? 'Add a provider first' : filter === ALL ? 'No models in the catalogue' : 'No models for this provider'}
          description="Models, prices and context sizes are entered by an administrator from the provider’s documentation. None are built in."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Price per 1M tokens</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => {
                const verifying = verify.isPending && verify.variables === model.id;
                const priced = model.pricing.inputPerMillion !== null && model.pricing.outputPerMillion !== null;
                return (
                  <TableRow key={model.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{model.displayName}</span>
                        {model.isDefault && <Badge variant="default">Provider default</Badge>}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{model.modelId}</div>
                      <div className="text-xs text-muted-foreground">{model.providerSlug}</div>
                      {model.description && <div className="mt-1 max-w-64 text-xs text-muted-foreground">{model.description}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-40 flex-wrap gap-1">
                        {model.capabilities.map((capability) => (
                          <Badge key={capability} variant="secondary" className="font-normal">
                            {CAPABILITY_LABELS[capability]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-foreground">{model.contextWindow === null ? <span className="text-muted-foreground">not set</span> : model.contextWindow.toLocaleString()}</TableCell>
                    <TableCell>
                      {priced ? (
                        <div className="space-y-0.5 text-sm tabular-nums text-foreground">
                          <div>
                            In {formatPrice(model.pricing.inputPerMillion)} · Out {formatPrice(model.pricing.outputPerMillion)} {model.pricing.currency}
                          </div>
                          {model.pricing.cachedInputPerMillion !== null && <div className="text-xs text-muted-foreground">Cached in {formatPrice(model.pricing.cachedInputPerMillion)}</div>}
                        </div>
                      ) : (
                        <Badge variant="outline">Not priced</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <VerifiedBadge model={model} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={model.enabled}
                        disabled={!canWrite || (!model.enabled && !ready(model))}
                        aria-label={`${model.enabled ? 'Disable' : 'Enable'} ${model.displayName}`}
                        title={!model.enabled && !ready(model) ? 'Set prices and verify the model first' : undefined}
                        onCheckedChange={(next) => {
                          setEnabled.reset();
                          setConfirm({ kind: next ? 'enable' : 'disable', model });
                        }}
                      />
                      {canWrite && model.enabled && !model.isDefault && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => {
                            setDefault.reset();
                            setConfirm({ kind: 'default', model });
                          }}
                        >
                          Make default
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {canWrite && (
                          <Button variant="outline" size="sm" disabled={verifying} onClick={() => runVerify(model)}>
                            <BadgeCheck className="size-4" aria-hidden />
                            {verifying ? 'Verifying…' : 'Verify'}
                          </Button>
                        )}
                        {canWrite && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPricing.reset();
                              setPricingFor(model);
                            }}
                          >
                            <CircleDollarSign className="size-4" aria-hidden />
                            Prices
                          </Button>
                        )}
                        {canWrite && (
                          <Button variant="ghost" size="sm" aria-label={`Edit ${model.displayName}`} onClick={() => openForm(model)}>
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

      <ModelFormDialog
        open={form.open}
        onOpenChange={(open) => (open ? undefined : closeForm())}
        editing={form.editing ? live(form.editing) : null}
        providers={providers}
        defaultProviderId={filter === ALL ? (providers[0]?.id ?? null) : filter}
        isPending={create.isPending || update.isPending}
        error={form.editing ? update.error : create.error}
        onCreate={(input) =>
          create.mutate(input, {
            onSuccess: (model) => {
              closeForm();
              notify(`${model.displayName} was added. Set its prices and verify it before enabling.`, 'success');
            },
          })
        }
        onUpdate={(id, input) =>
          update.mutate(
            { id, input },
            {
              onSuccess: (model) => {
                closeForm();
                notify(`${model.displayName} was updated.`, 'success');
              },
            },
          )
        }
      />

      <PricingDialog
        open={pricingFor !== null}
        onOpenChange={(open) => (open ? undefined : setPricingFor(null))}
        model={pricingFor ? live(pricingFor) : null}
        isPending={setPricing.isPending}
        error={setPricing.error}
        onSubmit={(id, input) =>
          setPricing.mutate(
            { id, input },
            {
              onSuccess: (saved) => {
                setPricingFor(null);
                // The server's answer is what counts: say so if it is not what was asked for.
                const same =
                  pricesEqual(saved.pricing.inputPerMillion, input.inputPerMillion) &&
                  pricesEqual(saved.pricing.outputPerMillion, input.outputPerMillion) &&
                  pricesEqual(saved.pricing.cachedInputPerMillion, input.cachedInputPerMillion) &&
                  saved.pricing.currency === input.currency;
                if (same) notify(`Prices for ${saved.displayName} were saved.`, 'success');
                else notify(`The server saved different prices for ${saved.displayName} than were entered. Check them before relying on them.`, 'warning');
              },
            },
          )
        }
      />

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || confirming ? undefined : setConfirm(null))}
          title={confirm.kind === 'enable' ? 'Enable this model?' : confirm.kind === 'disable' ? 'Disable this model?' : 'Make this the provider’s default model?'}
          description={`${confirm.model.displayName} (${confirm.model.modelId}). ${
            confirm.kind === 'enable'
              ? 'Workspaces on the plans you allow will be answered by this model.'
              : confirm.kind === 'disable'
                ? 'Workspaces stop being answered by it. It stops being the provider’s default if it is one.'
                : 'It is chosen first when a workspace’s plan is allowed more than one model of this provider.'
          }`}
          confirmLabel={confirm.kind === 'enable' ? 'Enable model' : confirm.kind === 'disable' ? 'Disable model' : 'Make default'}
          destructive={confirm.kind === 'disable'}
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
