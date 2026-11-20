import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/apiError';
import { INSTRUCTION_HELP } from '../instructionHelp';
import { useAiRouting, useUpdateRouting } from '../routingHooks';
import type { InstructionKey } from '../types';
import { LoadFailed } from './LoadFailed';
import type { Notify } from './notice';

/** What each role is, so a box is not just "Model 3". Titles come from INSTRUCTION_HELP. */
const GROUPS: Array<{ heading: string; hint: string; keys: InstructionKey[] }> = [
  { heading: 'For every customer reply', hint: 'Applies whichever model answers.', keys: ['main'] },
  { heading: 'For one role', hint: 'Added after the main instruction, only when that model answers.', keys: ['slot1', 'slot2', 'slot3', 'slot4'] },
  { heading: 'For the routing call', hint: 'Only about reading a message. Its answer format is fixed.', keys: ['router'] },
];

/**
 * Platform instructions: a main instruction and one for the intent router and each of Models 1 to 4, written by a super admin and applied to
 * every workspace. The fixed safety rules always come first and win; in a customer reply these come next (main, then the answering model's),
 * and the workspace's own single instruction box comes after. Only the boxes that were edited are sent, and an empty box clears.
 */
export function InstructionsTab({ canWrite, notify }: { canWrite: boolean; notify: Notify }) {
  const routing = useAiRouting();
  const update = useUpdateRouting();
  const [draft, setDraft] = useState<Partial<Record<InstructionKey, string>>>({});

  if (routing.isError) return <LoadFailed error={routing.error} what="the instructions" onRetry={() => void routing.refetch()} />;
  if (routing.isLoading || !routing.data) return <Skeleton className="h-64 w-full" />;

  const overview = routing.data;
  const limits = overview.instructionLimits ?? { main: 4000, role: 2000 };
  const saved = (key: InstructionKey): string => overview.policy.instructions?.[key] ?? '';
  const value = (key: InstructionKey): string => draft[key] ?? saved(key);
  const changed = (Object.keys(draft) as InstructionKey[]).filter((key) => draft[key] !== saved(key));
  const dirty = changed.length > 0;

  const save = () => {
    const input = Object.fromEntries(changed.map((key) => [key, draft[key] ?? ''])) as Partial<Record<InstructionKey, string>>;
    update.mutate(
      { instructions: input },
      {
        onSuccess: () => {
          setDraft({});
          notify('Instructions saved.', 'success');
        },
        onError: (error) => notify(apiErrorMessage(error, 'The change was refused.'), 'error'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">Instructions</h2>
          {dirty && <Badge variant="warning">Unsaved changes</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Written here and applied to every workspace; only super admins can see or change them. In a customer reply the order is: the fixed safety rules (they cannot be changed here and always win), then the main instruction, then the instruction of the model that answers, then the
          business data, then the workspace’s own instructions. The workspace keeps its single instruction box in its own AI settings. An empty box means none.
        </p>
      </Card>

      {GROUPS.map((group) => (
        <Card key={group.heading} className="space-y-3 p-4">
          <div>
            <h3 className="font-medium">{group.heading}</h3>
            <p className="text-sm text-muted-foreground">{group.hint}</p>
          </div>
          {group.keys.map((key) => {
            const max = key === 'main' ? limits.main : limits.role;
            return (
              <div key={key} className="space-y-1">
                <Label htmlFor={`instruction-${key}`}>{INSTRUCTION_HELP[key].title}</Label>
                <Textarea
                  id={`instruction-${key}`}
                  aria-label={INSTRUCTION_HELP[key].title}
                  rows={key === 'main' ? 6 : 4}
                  maxLength={max}
                  disabled={!canWrite}
                  placeholder={INSTRUCTION_HELP[key].placeholder}
                  value={value(key)}
                  onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {value(key).length.toLocaleString()} / {max.toLocaleString()} characters.
                </p>
              </div>
            );
          })}
        </Card>
      ))}

      {canWrite && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" disabled={!dirty || update.isPending} onClick={() => setDraft({})}>
            Cancel
          </Button>
          <Button disabled={!dirty || update.isPending} onClick={save}>
            {update.isPending ? 'Saving…' : 'Save instructions'}
          </Button>
        </div>
      )}
    </div>
  );
}
