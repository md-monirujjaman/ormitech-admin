import { BadgeCheck, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
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
import { VERIFICATION_TEXT } from '../format';
import { useAiModels, useCreateModel, useDeleteModel, useSetModelEnabled, useUpdateModel, useVerifyModel } from '../hooks';
import { CAPABILITY_LABELS } from '../schemas';
import type { AiModel } from '../types';
import { LoadFailed } from './LoadFailed';
import { ModelFormDialog } from './ModelDialogs';
import { VerifiedBadge } from './StatusBadges';
import type { Notify } from './notice';

type Confirm = { kind: 'enable' | 'disable' | 'delete'; model: AiModel };

export function ModelsTab({ canWrite, notify }: { canWrite: boolean; notify: Notify }) {
  const modelsQuery = useAiModels();
  const create = useCreateModel();
  const update = useUpdateModel();
  const verify = useVerifyModel();
  const setEnabled = useSetModelEnabled();
  const remove = useDeleteModel();

  const [form, setForm] = useState<{ open: boolean; editing: AiModel | null }>({ open: false, editing: null });
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
  const ready = (model: AiModel) => model.availabilityVerifiedAt !== null && model.capabilities.includes('chat');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">A model can be used only when it is verified with OpenRouter and enabled, and chosen in the Routing tab. Every workspace is answered by these models. What a request costs is OpenRouter’s own figure, checked per model in the Credit System page: nothing is typed here.</p>
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
          description="Add the models you want to use with OpenRouter’s own ids. None are built in."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => {
                const verifying = verify.isPending && verify.variables === model.id;
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
                      <VerifiedBadge model={model} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={model.enabled}
                        disabled={!canWrite || (!model.enabled && !ready(model))}
                        aria-label={`${model.enabled ? 'Disable' : 'Enable'} ${model.displayName}`}
                        title={!model.enabled && !ready(model) ? 'Verify the model first' : undefined}
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
              notify(`${model.displayName} was added. Verify it before enabling.`, 'success');
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
                : 'It is removed from the list. A model that is in use in the Routing tab, or that has recorded usage, cannot be deleted: switch it off instead.'
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
