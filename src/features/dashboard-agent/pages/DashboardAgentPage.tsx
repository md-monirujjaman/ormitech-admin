import { Bot, Loader2, ThumbsDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import { useAgentFeedback, useAgentOverview, useSaveAgentModels } from '../hooks';
import { REASON_LABELS, type AgentOverview, type AgentSlot } from '../types';

const DEFAULT = 'default';
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function slotLabel(overview: AgentOverview, role: string | null): string {
  const slot = overview.slots.find((entry) => entry.role === role);
  return slot ? `${slot.label}${slot.modelId ? ` · ${slot.modelId}` : ''}` : 'Platform default';
}

/** One model picker: the slots the platform already set up for the AI, and "Platform default" (Model 1) for none. */
function SlotSelect({ label, hint, value, overview, exclude, onChange, disabled }: { label: string; hint: string; value: AgentSlot | null; overview: AgentOverview; exclude: AgentSlot | null; onChange: (value: AgentSlot | null) => void; disabled: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value ?? DEFAULT} disabled={disabled} onValueChange={(next) => onChange(next === DEFAULT ? null : (next as AgentSlot))}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT}>Platform default (Model 1)</SelectItem>
          {overview.slots.map((slot) => (
            <SelectItem key={slot.role} value={slot.role} disabled={!slot.modelId || slot.role === exclude}>
              {slot.label} · {slot.modelId ?? 'no model set'}
              {slot.modelId && !slot.ready ? ' (not ready)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * The client dashboard's AI Agent: which models it uses (a main one and a backup, chosen from the model slots set in AI Gateway & Models) and how its
 * answers are doing: how many got a thumbs down in the last 30 days, per model, and each one with the question, the answer, the reason and the note.
 */
export default function DashboardAgentPage() {
  const { can } = usePermissions();
  const canWrite = can('ai_providers.write');
  const overview = useAgentOverview();
  const feedback = useAgentFeedback();
  const save = useSaveAgentModels();

  const [primary, setPrimary] = useState<AgentSlot | null>(null);
  const [backup, setBackup] = useState<AgentSlot | null>(null);
  const data = overview.data;
  useEffect(() => {
    if (data) {
      setPrimary(data.primaryRole);
      setBackup(data.backupRole);
    }
  }, [data]);

  const changed = data !== undefined && (primary !== data.primaryRole || backup !== data.backupRole);
  const items = feedback.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Agent" description="The AI Agent in the client dashboard: the models it uses and how its answers are doing." showMockNotice={false} />

      {overview.isError ? (
        <ErrorState title="Couldn't load the agent" description={apiErrorMessage(overview.error, 'The OrmiTech API refused the request.')} onRetry={() => overview.refetch()} />
      ) : !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold">Models</h2>
              <p className="text-sm text-muted-foreground">Pick from the models already set up in AI Gateway &amp; Models. If the main model fails, the backup answers; the platform default is always tried last, so the agent never goes silent.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SlotSelect label="Main model" hint="Answers every agent message." value={primary} overview={data} exclude={backup} onChange={setPrimary} disabled={!canWrite || save.isPending} />
              <SlotSelect label="Backup model" hint="Used only when the main model is unavailable or fails." value={backup} overview={data} exclude={primary} onChange={setBackup} disabled={!canWrite || save.isPending} />
            </div>
            {save.isError && (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(save.error, 'The change was not saved.')}
              </p>
            )}
            {canWrite && (
              <div className="flex items-center gap-3">
                <Button disabled={!changed || save.isPending} onClick={() => save.mutate({ primaryRole: primary, backupRole: backup })}>
                  {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Save models
                </Button>
                {data.updatedAt && <span className="text-xs text-muted-foreground">Last saved {when(data.updatedAt)}</span>}
              </div>
            )}
          </Card>

          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold">How the answers did</h2>
              <p className="text-sm text-muted-foreground">The last {data.stats.days} days. Only a thumbs down can be given, so the share shows how often an answer was marked as not good.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Answers</p>
                <p className="text-2xl font-semibold tabular-nums">{data.stats.answers}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Thumbs down</p>
                <p className="text-2xl font-semibold tabular-nums">{data.stats.thumbsDown}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Marked as not good</p>
                <p className="text-2xl font-semibold tabular-nums">{data.stats.thumbsDownPercent === null ? '–' : `${data.stats.thumbsDownPercent}%`}</p>
              </div>
            </div>
            {data.stats.byModel.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Model</th>
                    <th className="py-2 text-right font-medium">Answers</th>
                    <th className="py-2 text-right font-medium">Thumbs down</th>
                    <th className="py-2 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stats.byModel.map((row) => (
                    <tr key={row.role ?? 'unknown'} className="border-b last:border-0">
                      <td className="py-2">{row.role ? slotLabel(data, row.role) : 'Before models were recorded'}</td>
                      <td className="py-2 text-right tabular-nums">{row.answers}</td>
                      <td className="py-2 text-right tabular-nums">{row.thumbsDown}</td>
                      <td className="py-2 text-right tabular-nums">{row.answers > 0 ? `${Math.round((row.thumbsDown / row.answers) * 1000) / 10}%` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      <section aria-label="Thumbs down" className="space-y-3">
        <h2 className="text-base font-semibold">Thumbs down</h2>
        {feedback.isError ? (
          <ErrorState title="Couldn't load the thumbs down" description={apiErrorMessage(feedback.error, 'The OrmiTech API refused the request.')} onRetry={() => feedback.refetch()} />
        ) : feedback.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <EmptyState icon={Bot} title="No thumbs down yet" description="When a customer marks an answer as not good, it shows here with what they asked and what the agent said." />
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <Card key={item.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <ThumbsDown className="size-3.5" aria-hidden />
                  <Badge variant="secondary">{REASON_LABELS[item.reason] ?? item.reason}</Badge>
                  <span className="font-medium text-foreground">{item.workspace}</span>
                  <span>{when(item.createdAt)}</span>
                  {item.modelId && <span>· {item.modelId}</span>}
                </div>
                {item.note && <p className="rounded-md bg-muted px-3 py-2 text-sm">“{item.note}”</p>}
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Asked</p>
                    <p className="whitespace-pre-wrap break-words">{item.question || '–'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Agent answered</p>
                    <p className="whitespace-pre-wrap break-words">{item.answer}</p>
                  </div>
                </div>
              </Card>
            ))}
            {feedback.hasNextPage && (
              <Button variant="outline" className="justify-self-center" disabled={feedback.isFetchingNextPage} onClick={() => feedback.fetchNextPage()}>
                {feedback.isFetchingNextPage && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Show older
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
