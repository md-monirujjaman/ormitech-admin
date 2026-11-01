import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePlans } from '@/features/plans/hooks';
import { apiErrorMessage } from '@/lib/apiError';
import { sameSet } from '../format';
import { useAiModels, useSetPlanAccess } from '../hooks';
import type { AiModel } from '../types';
import { LoadFailed } from './LoadFailed';
import type { Notify } from './notice';

/**
 * Which plans may use which model. A plan that is not ticked never reaches the model; with nothing ticked the model is
 * offered to no one. Changes are saved a model at a time, after a confirmation that lists what is added and removed.
 */
export function PlanAccessTab({ canWrite, notify }: { canWrite: boolean; notify: Notify }) {
  const modelsQuery = useAiModels();
  const plansQuery = usePlans();
  const save = useSetPlanAccess();
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState<{ model: AiModel; slugs: string[] } | null>(null);

  if (modelsQuery.isError) return <LoadFailed error={modelsQuery.error} what="the model catalogue" onRetry={() => void modelsQuery.refetch()} />;
  if (plansQuery.isError) return <LoadFailed error={plansQuery.error} what="the plans" onRetry={() => void plansQuery.refetch()} />;
  if (modelsQuery.isLoading || plansQuery.isLoading || !modelsQuery.data || !plansQuery.data) return <Skeleton className="h-64 w-full" />;

  const models = modelsQuery.data;
  // Only active plans can be allowed: the API refuses any other.
  const plans = plansQuery.data.filter((plan) => plan.status === 'active');

  if (models.length === 0) return <EmptyState icon={ShieldCheck} title="No models yet" description="Add models in the Models tab, then choose which plans may use them here." />;
  if (plans.length === 0) return <EmptyState icon={ShieldCheck} title="No active plans" description="Plan access is set per active plan. Create or activate a plan first." />;

  const slugsOf = (model: AiModel) => drafts[model.id] ?? model.planSlugs;
  const toggle = (model: AiModel, slug: string) => {
    const current = slugsOf(model);
    setDrafts((existing) => ({ ...existing, [model.id]: current.includes(slug) ? current.filter((entry) => entry !== slug) : [...current, slug] }));
  };
  const diff = (model: AiModel, slugs: string[]) => ({ added: slugs.filter((slug) => !model.planSlugs.includes(slug)), removed: model.planSlugs.filter((slug) => !slugs.includes(slug)) });

  const run = () => {
    if (!pending) return;
    const { model, slugs } = pending;
    save.mutate(
      { id: model.id, planSlugs: slugs },
      {
        onSuccess: (saved) => {
          setPending(null);
          setDrafts((existing) => {
            const next = { ...existing };
            delete next[model.id];
            return next;
          });
          // What the server stored is what counts.
          if (sameSet(saved.planSlugs, slugs)) notify(`Plan access for ${saved.displayName} was saved.`, 'success');
          else notify(`The server saved a different set of plans for ${saved.displayName} than was chosen. It now shows what is stored.`, 'warning');
        },
      },
    );
  };

  const change = pending ? diff(pending.model, pending.slugs) : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Tick the plans that may use each model. A model with no plan ticked is offered to no one.</p>
      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              {plans.map((plan) => (
                <TableHead key={plan.id} className="text-center">
                  {plan.name}
                </TableHead>
              ))}
              <TableHead className="text-right">Save</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => {
              const slugs = slugsOf(model);
              const dirty = !sameSet(slugs, model.planSlugs);
              const unknown = model.planSlugs.filter((slug) => !plans.some((plan) => plan.slug === slug));
              return (
                <TableRow key={model.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{model.displayName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {model.providerSlug}/{model.modelId}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {model.enabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="outline">Disabled</Badge>}
                      {unknown.map((slug) => (
                        <Badge key={slug} variant="warning" title="This plan is not active any more">
                          {slug}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  {plans.map((plan) => (
                    <TableCell key={plan.id} className="text-center">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={slugs.includes(plan.slug)}
                        disabled={!canWrite || save.isPending}
                        aria-label={`${plan.name} may use ${model.displayName}`}
                        onChange={() => toggle(model, plan.slug)}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    {canWrite && (
                      <Button
                        size="sm"
                        variant={dirty ? 'default' : 'outline'}
                        disabled={!dirty || save.isPending}
                        onClick={() => {
                          save.reset();
                          setPending({ model, slugs: [...slugs] });
                        }}
                      >
                        Save
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {pending && change && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || save.isPending ? undefined : setPending(null))}
          title="Change which plans may use this model?"
          description={`${pending.model.displayName} (${pending.model.modelId}).`}
          confirmLabel="Save plan access"
          destructive={change.removed.length > 0}
          isPending={save.isPending}
          onConfirm={run}
        >
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Allowed after saving: </span>
              <span className="text-foreground">{pending.slugs.length === 0 ? 'no plan' : [...pending.slugs].sort().join(', ')}</span>
            </p>
            {change.added.length > 0 && <p className="text-success">Added: {change.added.join(', ')}</p>}
            {change.removed.length > 0 && <p className="text-destructive">Removed: {change.removed.join(', ')}. Workspaces on these plans stop being answered by this model.</p>}
          </div>
          {save.error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(save.error, 'The plan access was refused.')}
            </p>
          ) : null}
        </ConfirmDialog>
      )}
    </div>
  );
}
