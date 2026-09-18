import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { LimitField } from '@/components/shared/LimitField';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { aiConfigurationSchema, type AiConfigurationFormValues } from '@/features/organizations/schemas';
import type { ResolvedEntitlements } from '@/types/entitlements';
import type { Organization } from '@/types/organization';

/** Placeholder model options. No AI provider is called from the Admin — ormitech-api owns that in a later phase. */
const MODEL_OPTIONS = [
  { value: 'none', label: 'Not set' },
  { value: 'ormitech-default', label: 'OrmiTech Default' },
  { value: 'ormitech-advanced', label: 'OrmiTech Advanced' },
];

export function AiTab({
  organization,
  resolved,
  canWrite,
  isPending,
  onSave,
}: {
  organization: Organization;
  resolved: ResolvedEntitlements;
  canWrite: boolean;
  isPending: boolean;
  onSave: (configuration: Organization['ai']) => void;
}) {
  const aiEntitled = resolved.features.ai_bot?.enabled ?? false;
  const advancedEntitled = resolved.features.advanced_ai?.enabled ?? false;
  const handoverEntitled = resolved.features.human_handover?.enabled ?? false;

  const form = useForm<AiConfigurationFormValues>({
    resolver: zodResolver(aiConfigurationSchema),
    defaultValues: {
      aiEnabled: organization.ai.aiEnabled,
      aiBotEnabled: organization.ai.aiBotEnabled,
      humanHandoverEnabled: organization.ai.humanHandoverEnabled,
      conversationLimit: organization.ai.conversationLimit,
      messageLimit: organization.ai.messageLimit,
      model: organization.ai.model,
      systemPrompt: organization.ai.systemPrompt,
    },
  });

  const { control, register, handleSubmit, reset, formState } = form;

  useEffect(() => {
    reset({
      aiEnabled: organization.ai.aiEnabled,
      aiBotEnabled: organization.ai.aiBotEnabled,
      humanHandoverEnabled: organization.ai.humanHandoverEnabled,
      conversationLimit: organization.ai.conversationLimit,
      messageLimit: organization.ai.messageLimit,
      model: organization.ai.model,
      systemPrompt: organization.ai.systemPrompt,
    });
  }, [organization.ai, reset]);

  const disabled = !canWrite || isPending;

  function submit(values: AiConfigurationFormValues) {
    onSave({ ...organization.ai, ...values, updatedAt: new Date().toISOString() });
  }

  return (
    <form className="grid gap-4 xl:grid-cols-2" onSubmit={handleSubmit(submit)}>
      <div className="space-y-4">
        {!aiEntitled && (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
            This organization&apos;s plan doesn&apos;t include the AI Bot feature. Settings below can still be prepared, but enable the feature on
            the Features tab before AI will run for this tenant.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>AI settings</CardTitle>
            <CardDescription>What AI is allowed to do for this organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleField control={control} name="aiEnabled" label="AI enabled" description="Master switch for every AI capability." disabled={disabled} />
            <ToggleField control={control} name="aiBotEnabled" label="AI bot enabled" description="Automated replies on enabled channels." disabled={disabled} />
            <ToggleField
              control={control}
              name="humanHandoverEnabled"
              label="Human handover"
              description="Let an AI conversation be escalated to a human agent."
              disabled={disabled || !handoverEntitled}
              badge={!handoverEntitled ? <Badge variant="outline">Not in plan</Badge> : undefined}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI limits</CardTitle>
            <CardDescription>Caps ormitech-api will enforce once AI runs for this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="ai-conversation-limit">AI conversation limit</Label>
              <Controller
                control={control}
                name="conversationLimit"
                render={({ field }) => <LimitField id="ai-conversation-limit" value={field.value} onChange={field.onChange} disabled={disabled} />}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="ai-message-limit">AI message limit</Label>
              <Controller
                control={control}
                name="messageLimit"
                render={({ field }) => <LimitField id="ai-message-limit" value={field.value} onChange={field.onChange} disabled={disabled} />}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Model & prompt</CardTitle>
            <CardDescription>
              Configuration placeholders. The Admin records what this tenant should use; ormitech-api is what actually talks to a provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ai-model">Model</Label>
              <Controller
                control={control}
                name="model"
                render={({ field }) => (
                  <Select
                    value={field.value ?? 'none'}
                    disabled={disabled || !advancedEntitled}
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                  >
                    <SelectTrigger id="ai-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {!advancedEntitled && <p className="text-xs text-muted-foreground">Model selection requires the Advanced AI feature.</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai-prompt">System prompt</Label>
              <Textarea id="ai-prompt" rows={6} disabled={disabled || !advancedEntitled} {...register('systemPrompt')} />
              {formState.errors.systemPrompt && <p className="text-xs text-destructive">{formState.errors.systemPrompt.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge sources</CardTitle>
            <CardDescription>What the AI is allowed to draw on. Ingestion is owned by ormitech-api.</CardDescription>
          </CardHeader>
          <CardContent>
            {organization.ai.knowledgeSources.length === 0 ? (
              <EmptyState
                className="border-0 py-8"
                title="No knowledge sources"
                description="Once ormitech-api supports knowledge ingestion, sources configured for this tenant appear here."
              />
            ) : (
              <ul className="space-y-2">
                {organization.ai.knowledgeSources.map((source) => (
                  <li key={source.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{source.label}</p>
                      <p className="text-xs capitalize text-muted-foreground">{source.type}</p>
                    </div>
                    <Badge variant={source.status === 'ready' ? 'success' : source.status === 'failed' ? 'destructive' : 'warning'}>
                      {source.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {canWrite && (
          <div className="flex justify-end">
            <Button type="submit" disabled={disabled || !formState.isDirty}>
              {isPending ? 'Saving…' : 'Save AI settings'}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

function ToggleField({
  control,
  name,
  label,
  description,
  disabled,
  badge,
}: {
  control: ReturnType<typeof useForm<AiConfigurationFormValues>>['control'];
  name: 'aiEnabled' | 'aiBotEnabled' | 'humanHandoverEnabled';
  label: string;
  description: string;
  disabled: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} aria-label={label} />}
      />
    </div>
  );
}
