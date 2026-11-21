import { CircleAlert, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { apiErrorMessage } from '@/lib/apiError';
import { useAiModels } from '../hooks';
import { effectiveEffort, EFFORT_SCALE } from '../effort';
import { useAiRouting, useAiRoutingHealth, useSyncEfforts, useUpdateRouting, useValidateRouting } from '../routingHooks';
import type { AiModel, ModelRole, ReasoningEffort, RoutingPolicy, RoutingProblem, UpdateRoutingInput } from '../types';
import { LoadFailed } from './LoadFailed';
import type { Notify } from './notice';

const NONE = '__none__';

const EFFORTS: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'default'];
const EFFORT_LABEL = (effort: ReasoningEffort) => (effort === 'default' ? 'Nothing (the provider decides)' : effort);

const ROLES: Array<{ role: ModelRole; field: 'routerModelId' | 'slot1ModelId' | 'slot2ModelId' | 'slot3ModelId' | 'slot4ModelId'; enabled: 'routerEnabled' | 'slot1Enabled' | 'slot2Enabled' | 'slot3Enabled' | 'slot4Enabled'; title: string; hint: string }> = [
  { role: 'router', field: 'routerModelId', enabled: 'routerEnabled', title: 'Intent router', hint: 'A small, fast model that reads a message only when the built-in rules cannot place it. Not one of the four slots.' },
  { role: 'slot1', field: 'slot1ModelId', enabled: 'slot1Enabled', title: 'Model 1: Primary', hint: 'Business conversation, Bangla and Banglish. Needed before routing can be switched on.' },
  { role: 'slot2', field: 'slot2ModelId', enabled: 'slot2Enabled', title: 'Model 2: Images and voice', hint: 'Reads pictures (needs Vision) and listens to voice messages (needs Audio).' },
  { role: 'slot3', field: 'slot3ModelId', enabled: 'slot3Enabled', title: 'Model 3: Specialist', hint: 'Complaints and hard cases, and the first model tried when another fails.' },
  { role: 'slot4', field: 'slot4ModelId', enabled: 'slot4Enabled', title: 'Model 4: Off-topic', hint: 'Only for genuinely off-topic chat. Never used when a model fails.' },
];

/** The numbers the form edits, as text so a half-typed value is not rewritten. */
type Numbers = Record<'maxRetries' | 'requestTimeoutMs' | 'routerTimeoutMs' | 'maxOutputTokens' | 'routerMaxTokens' | 'offtopicConfidence' | 'breakerThreshold' | 'breakerOpenSeconds' | 'maxAttemptsPerMessage', string>;
const numbersOf = (policy: RoutingPolicy): Numbers => ({
  maxRetries: policy.maxRetries === null ? '' : String(policy.maxRetries),
  requestTimeoutMs: policy.requestTimeoutMs === null ? '' : String(policy.requestTimeoutMs),
  routerTimeoutMs: String(policy.routerTimeoutMs),
  maxOutputTokens: String(policy.maxOutputTokens),
  routerMaxTokens: String(policy.routerMaxTokens),
  offtopicConfidence: String(policy.offtopicConfidence),
  breakerThreshold: String(policy.breakerThreshold),
  breakerOpenSeconds: String(policy.breakerOpenSeconds),
  maxAttemptsPerMessage: String(policy.maxAttemptsPerMessage),
});
const NUMBER_LABELS: Array<[keyof Numbers, string, string]> = [
  ['maxRetries', 'Extra attempts (0-5)', 'Blank uses the environment default (AI_MAX_RETRIES).'],
  ['requestTimeoutMs', 'Request timeout, ms', 'Blank uses AI_REQUEST_TIMEOUT.'],
  ['routerTimeoutMs', 'Router timeout, ms', ''],
  ['maxOutputTokens', 'Max reply tokens', ''],
  ['routerMaxTokens', 'Router max tokens', ''],
  ['offtopicConfidence', 'Off-topic confidence (0.5-1)', 'A verdict below this is ignored.'],
  ['breakerThreshold', 'Breaker: failures in a row', ''],
  ['breakerOpenSeconds', 'Breaker: seconds out of rotation', ''],
  ['maxAttemptsPerMessage', 'Attempts per message', 'Across every queue retry: stops retries from multiplying.'],
];

/**
 * Multi-model routing: which of the platform's models are the router and the four slots, retries, timeouts, the reasoning effort sent per
 * model and the fallback order. Models come from the Models tab (their prices and verification are set there). The API validates before saving and says what is wrong; nothing here returns or shows a key.
 */
export function RoutingTab({ canWrite, notify }: { canWrite: boolean; notify: Notify }) {
  const routing = useAiRouting();
  const models = useAiModels();
  const health = useAiRoutingHealth();
  const update = useUpdateRouting();
  const validate = useValidateRouting();
  const syncEfforts = useSyncEfforts();
  const [draft, setDraft] = useState<UpdateRoutingInput>({});
  const [numbers, setNumbers] = useState<Numbers | null>(null);
  const [problems, setProblems] = useState<RoutingProblem[] | null>(null);

  const policy = routing.data?.policy;
  useEffect(() => {
    if (policy) setNumbers(numbersOf(policy));
  }, [policy]);

  const options = useMemo(() => (models.data ?? []).filter((model: AiModel) => model.enabled), [models.data]);

  if (routing.isError) return <LoadFailed error={routing.error} what="the routing policy" onRetry={() => void routing.refetch()} />;
  if (routing.isLoading || !routing.data || !policy || !numbers) return <Skeleton className="h-64 w-full" />;

  const overview = routing.data;
  const value = <K extends keyof UpdateRoutingInput>(key: K): UpdateRoutingInput[K] | RoutingPolicy[Extract<K, keyof RoutingPolicy>] => (key in draft ? draft[key] : (policy as unknown as Record<string, unknown>)[key]) as never;
  const set = (patch: UpdateRoutingInput) => setDraft((current) => ({ ...current, ...patch }));
  const dirty = Object.keys(draft).length > 0 || JSON.stringify(numbers) !== JSON.stringify(numbersOf(policy));

  const efforts = (): Partial<Record<ModelRole, ReasoningEffort>> => ({ ...policy.reasoningEfforts, ...(draft.reasoningEfforts ?? {}) });
  /** What each model accepts, as read from OpenRouter (nobody types it in). A model not listed: not read yet. */
  const accepted = (): Record<string, string[]> => policy.modelEfforts ?? {};
  /** The effort this role asks for: its own setting, else the role's default (which the API really uses, never "nothing"). */
  const askedFor = (role: ModelRole): ReasoningEffort => efforts()[role] ?? overview.defaults.reasoningEfforts[role];
  /**
   * A model's name as it is saved, taken from the model list when that has arrived and from the routing view otherwise, so a saved model
   * is never shown as an empty field. `off` is true only when the API says the model is switched off.
   */
  const describe = (id: string): { label: string; off: boolean } => {
    const row = (models.data ?? []).find((entry) => entry.id === id);
    if (row) return { label: `${row.displayName} (${row.providerSlug}/${row.modelId})`, off: !row.enabled };
    const known = overview.models.find((entry) => entry.modelRowId === id);
    if (known) return { label: `${known.displayName} (${known.providerSlug}/${known.modelId})`, off: known.enabled === false };
    return { label: 'A saved model that is no longer in the model list', off: false };
  };

  const save = () => {
    const input: UpdateRoutingInput = { ...draft };
    const before = numbersOf(policy);
    const asNumber = (key: keyof Numbers) => (numbers[key].trim() === '' ? null : Number(numbers[key]));
    for (const key of Object.keys(numbers) as Array<keyof Numbers>) {
      if (numbers[key] === before[key]) continue;
      (input as Record<string, unknown>)[key] = key === 'maxRetries' || key === 'requestTimeoutMs' ? asNumber(key) : Number(numbers[key]);
    }
    update.mutate(input, {
      onSuccess: ({ warnings }) => {
        setDraft({});
        setProblems(warnings.length > 0 ? warnings : null);
        notify(warnings.length > 0 ? 'Saved, with warnings.' : 'Routing policy saved.', warnings.length > 0 ? 'warning' : 'success');
      },
      onError: (error) => notify(apiErrorMessage(error, 'The change was refused.'), 'error'),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={overview.effective.routingActive ? 'success' : 'secondary'}>{overview.effective.routingActive ? 'Routing is active' : 'Routing is not active'}</Badge>
          <Badge variant={overview.effective.gatewayReady ? 'success' : 'destructive'}>{overview.effective.gatewayReady ? 'AI gateway ready' : overview.gateway.configured ? 'No Model 1: the AI is off' : 'No key set: the AI is off'}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          With routing off, every AI request is answered by Model 1. With it on, a customer reply may go to Model 2, 3 or 4 by what it is about; the other AI work (suggestions, follow-ups, tagging, product import) keeps its fixed model. Every workspace is answered the same way: a workspace chooses nothing. Technical fallback never uses Model 4.
        </p>
        <div className="flex items-center gap-3">
          <Switch id="routing-enabled" aria-label="Routing enabled" checked={Boolean(value('enabled'))} disabled={!canWrite} onCheckedChange={(enabled) => set({ enabled })} />
          <Label htmlFor="routing-enabled">Enable routing for the platform</Label>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-medium">Understand first</h3>
          <Badge variant={overview.effective.understandFirstActive ? 'success' : 'secondary'}>{overview.effective.understandFirstActive ? 'Understand first is active' : 'Understand first is not active'}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Model 1 first works out what the customer wants and what step the chat is at (from the chat, the saved memory and the business data), then the model that answers is given that and returns only the reply. It is one extra short Model 1 request per customer message; greetings and thank-yous are skipped, and if it fails the reply goes out as it does with this off. Works only while routing is on.
        </p>
        <div className="flex items-center gap-3">
          <Switch id="understand-first" aria-label="Understand first" checked={Boolean(value('understandFirst'))} disabled={!canWrite || policy.understandFirstAvailable === false} onCheckedChange={(understandFirst) => set({ understandFirst })} />
          <Label htmlFor="understand-first">Model 1 understands first, then the right model replies</Label>
        </div>
        {policy.understandFirstAvailable === false && <p className="text-xs text-destructive">This needs the API database update 0081, which has not been applied yet, so the switch cannot be changed.</p>}
        {value('understandFirst') && !value('enabled') && <p className="text-xs text-destructive">Switch routing on as well: this has no effect while routing is off.</p>}
      </Card>

      {ROLES.map(({ role, field, enabled, title, hint }) => {
        const chosen = (value(field) as string | null) ?? null;
        const saved = ((policy as unknown as Record<string, unknown>)[field] as string | null | undefined) ?? null;
        // The details of the model saved for this role; after a change they are the old model's until the view is read again, so match the model too.
        const shown = overview.models.find((model) => model.role === role && model.modelRowId === saved);
        const chosenIsListed = chosen === null || options.some((model) => model.id === chosen);
        const chosenInfo = chosen === null ? null : describe(chosen);
        const effort = askedFor(role);
        const acceptedList = chosen === null ? null : (accepted()[chosen] ?? null);
        const sends = effectiveEffort(effort, acceptedList);
        return (
          <Card key={role} className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground">{hint}</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`${role}-on`} className="text-sm">On</Label>
                <Switch id={`${role}-on`} aria-label={`${title} on`} checked={Boolean(value(enabled))} disabled={!canWrite} onCheckedChange={(on) => set({ [enabled]: on })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`${role}-model`}>Model</Label>
                <Select value={chosen ?? NONE} disabled={!canWrite} onValueChange={(next) => set({ [field]: next === NONE ? null : next })}>
                  <SelectTrigger id={`${role}-model`} aria-label={`${title} model`}>
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not set</SelectItem>
                    {!chosenIsListed && chosen !== null && chosenInfo && <SelectItem value={chosen}>{chosenInfo.label}</SelectItem>}
                    {options.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.displayName} ({model.providerSlug}/{model.modelId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field in draft && chosen !== saved ? (
                  <p className="text-xs text-muted-foreground">
                    Not saved yet. Saved now: {saved === null ? 'nothing (Not set)' : describe(saved).label}.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">{saved === null ? 'Nothing is saved for this role.' : 'Saved.'}</p>
                )}
                {!chosenIsListed && chosenInfo?.off && !(field in draft) && (
                  <p className="text-xs text-destructive">The saved model is switched off, so it is not in the choices below. Switch it on in the Models tab, or pick another model.</p>
                )}
                {shown && !(field in draft) && (
                  <p className="text-xs text-muted-foreground">
                    {shown.capabilities.join(', ')} · {shown.contextWindow ? `${shown.contextWindow.toLocaleString()} tokens` : 'context not set'} · {shown.usable ? 'ready' : 'not ready: price it, verify it and switch it on in the Models tab'}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${role}-effort`}>Reasoning effort</Label>
                <Select value={effort} disabled={!canWrite} onValueChange={(next) => set({ reasoningEfforts: { ...efforts(), [role]: next as ReasoningEffort } })}>
                  <SelectTrigger id={`${role}-effort`} aria-label={`${title} reasoning effort`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EFFORTS.filter((entry) => entry === effort || entry === 'default' || acceptedList === null || acceptedList.includes(entry)).map((entry) => (
                      <SelectItem key={entry} value={entry}>
                        {EFFORT_LABEL(entry)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {efforts()[role] === undefined && <p className="text-xs text-muted-foreground">Not set: this role uses “{overview.defaults.reasoningEfforts[role]}”.</p>}
                <p className="text-xs text-muted-foreground" data-testid={`${role}-accepts`}>
                  {chosen === null
                    ? 'No model chosen.'
                    : acceptedList === null
                      ? 'This model’s efforts are not read yet: they are read from OpenRouter when you save, or press “Read efforts from OpenRouter”.'
                      : acceptedList.length === 0
                        ? 'This model takes no reasoning effort: nothing is sent to it.'
                        : `This model accepts (read from OpenRouter): ${EFFORT_SCALE.filter((entry) => acceptedList.includes(entry)).join(', ') || 'none of these'}.`}
                </p>
                <p className="text-xs" data-testid={`${role}-sends`}>
                  {chosen === null ? '' : sends === 'default' ? 'Sends nothing: the provider decides.' : sends === effort ? `Sends: ${sends}.` : `Sends: ${sends} (the model does not accept ${effort}, so the nearest it accepts).`}
                </p>
              </div>
            </div>
          </Card>
        );
      })}

      <Card className="space-y-3 p-4">
        <h3 className="font-medium">Retries, timeouts and limits</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {NUMBER_LABELS.map(([key, label, hint]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`num-${key}`}>{label}</Label>
              <Input id={`num-${key}`} inputMode="decimal" disabled={!canWrite} value={numbers[key]} onChange={(event) => setNumbers((current) => (current ? { ...current, [key]: event.target.value } : current))} />
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Label>Fallback order (slots tried after the chosen one fails; Model 4 is never listed)</Label>
          <div className="flex flex-wrap gap-4">
            {[1, 2, 3].map((slot) => {
              const list = (value('fallbackSlots') as number[]) ?? [];
              const on = list.includes(slot);
              return (
                <label key={slot} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" aria-label={`Fallback slot ${slot}`} disabled={!canWrite} checked={on} onChange={() => set({ fallbackSlots: (on ? list.filter((entry) => entry !== slot) : [...list, slot]) as Array<1 | 2 | 3> })} />
                  Model {slot}
                  {on && <span className="text-muted-foreground">(position {list.indexOf(slot) + 1})</span>}
                </label>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        {canWrite && (
          <Button disabled={!dirty || update.isPending} onClick={save}>
            Save routing policy
          </Button>
        )}
        {canWrite && (
          <Button
            variant="outline"
            disabled={syncEfforts.isPending}
            onClick={() =>
              syncEfforts.mutate(undefined, {
                onSuccess: (result) => notify(result.unknown.length > 0 ? `Read the reasoning efforts of ${result.synced} model(s). Not in OpenRouter's list: ${result.unknown.join(', ')}.` : `Read the reasoning efforts of ${result.synced} model(s).`, result.unknown.length > 0 ? 'warning' : 'success'),
                onError: (error) => notify(apiErrorMessage(error, 'OpenRouter could not be read.'), 'error'),
              })
            }
          >
            <RefreshCw className="mr-2 size-4" aria-hidden /> Read efforts from OpenRouter
          </Button>
        )}
        <Button variant="outline" disabled={validate.isPending} onClick={() => validate.mutate(undefined, { onSuccess: (result) => setProblems(result.problems), onError: (error) => notify(apiErrorMessage(error, 'The change was refused.'), 'error') })}>
          <ShieldCheck className="mr-2 size-4" aria-hidden /> Check the configuration
        </Button>
        {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
      </div>

      {problems && (
        <Card className="space-y-2 p-4" aria-live="polite">
          {problems.length === 0 ? (
            <p className="text-sm">Everything checks out.</p>
          ) : (
            problems.map((problem) => (
              <p key={`${problem.role}-${problem.code}`} className="flex items-start gap-2 text-sm">
                {problem.level === 'error' ? <CircleAlert className="mt-0.5 size-4 text-destructive" aria-hidden /> : <TriangleAlert className="mt-0.5 size-4 text-warning" aria-hidden />}
                <span>
                  <strong>{problem.role}</strong>: {problem.message}
                </span>
              </p>
            ))
          )}
        </Card>
      )}

      {health.data && health.data.breakers.some((entry) => entry.open) && (
        <Card className="space-y-1 p-4">
          <h3 className="font-medium">Models out of rotation (this instance)</h3>
          {health.data.breakers
            .filter((entry) => entry.open)
            .map((entry) => (
              <p key={entry.modelRowId} className="text-sm">
                {(models.data ?? []).find((model) => model.id === entry.modelRowId)?.displayName ?? entry.modelRowId} until {entry.openUntil}
              </p>
            ))}
        </Card>
      )}
    </div>
  );
}
