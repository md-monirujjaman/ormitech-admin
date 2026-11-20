import { BadgeCheck, CircleDollarSign, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
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
import { VERIFICATION_TEXT, formatPrice, pricesEqual } from '../format';
import { useAiModels, useCreateModel, useDeleteModel, useSetModelEnabled, useSetModelPricing, useUpdateModel, useVerifyModel } from '../hooks';
import { CAPABILITY_LABELS } from '../schemas';
import type { AiModel } from '../types';
import { LoadFailed } from './LoadFailed';
import { ModelFormDialog, PricingDialog } from './ModelDialogs';
import { VerifiedBadge } from './StatusBadges';
import type { Notify } from './notice';

type Confirm = { kind: 'enable' | 'disable' | 'delete'; model: AiModel };

export function ModelsTab({ canWrite, notify }: { canWrite: boolean; notify: Notify }) {
  const modelsQuery = useAiModels();
  const create = useCreateModel();
  const update = useUpdateModel();
  const setPricing = useSetModelPricing();
  const verify = useVerifyModel();
  const setEnabled = useSetModelEnabled();
  const remove = useDeleteModel();

  const [form, setForm] = useState<{ open: boolean; editing: AiModel | null }>({ open: false, editing: null });
  const [pricingFor, setPricingFor] = useState<AiModel | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  if (modelsQuery.isError) return <LoadFailed error={modelsQuery.error} what="the model list" onRetry={() => void modelsQuery.refetch()} />;
  if (modelsQuery.isLoading || !modelsQuery.data) return <Skeleton className="h-64 w-full" />;

  const models = modelsQuery.data;
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
    if (confirm.kind === 'delete') return remove.mutate(model.id, done(`${model.displayName} was deleted.`));
    const enabled = confirm.kind === 'enable';
    setEnabled.mutate({ id: model.id, enabled }, done(`${model.displayName} was ${enabled ? 'enabled' : 'disabled'}.`));
  };

  const confirming = setEnabled.isPending || remove.isPending;
  const confirmError = confirm?.kind === 'delete' ? remove.error : setEnabled.error;
  const ready = (model: AiModel) => model.pricing.inputPerMillion !== null && model.pricing.outputPerMillion !== null && model.availabilityVerifiedAt !== null && model.capabilities.includes('chat');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">A model can be used only when it is priced, verified with OpenRouter and enabled, and chosen in the Routing tab. Every workspace is answered by these models.</p>
        {canWrite && (
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus className="size-4" aria-hidden />
            Add model
          </Button>
        )}
      </div>

      {models.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No models yet"
          description="Add the models you want to use with OpenRouter’s own ids. Prices and context sizes are entered from OpenRouter’s model pages; none are built in."
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
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{model.modelId}</div>
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
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${model.displayName}`}
                            onClick={() => {
                              remove.reset();
                              setConfirm({ kind: 'delete', model });
                            }}
                          >
                            <Trash2 className="size-4" aria-hidden />
                            Delete
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
          title={confirm.kind === 'enable' ? 'Enable this model?' : confirm.kind === 'disable' ? 'Disable this model?' : 'Delete this model?'}
          description={`${confirm.model.displayName} (${confirm.model.modelId}). ${
            confirm.kind === 'enable'
              ? 'It can then answer customers when it is chosen in the Routing tab.'
              : confirm.kind === 'disable'
                ? 'It stops answering customers right away if it is in use. Nothing else changes.'
                : 'It is removed from the list. A model that is in use in the Routing tab, or that has a price history or recorded usage, cannot be deleted: switch it off instead.'
          }`}
          confirmLabel={confirm.kind === 'enable' ? 'Enable model' : confirm.kind === 'disable' ? 'Disable model' : 'Delete model'}
          destructive={confirm.kind !== 'enable'}
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
