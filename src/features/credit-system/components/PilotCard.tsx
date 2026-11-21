import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { apiErrorMessage } from '@/lib/apiError';
import { formatWhen, shortId } from '../format';
import { useAddPilotWorkspace, useCreditSettings, usePilotWorkspaces, useRemovePilotWorkspace, useSetPilotRestriction } from '../hooks';
import { fieldErrors, workspaceIdSchema } from '../schemas';
import type { PilotWorkspace } from '../types';
import { Notice, Problem, type NoticeState } from './shared';

/**
 * The pilot allowlist. With the restriction on, a workspace that is not listed is in credit mode off, whatever the platform or its own
 * setting says: the restriction only ever lowers a mode. Each workspace shows who added it and when; every change is in the audit log.
 */
export function PilotCard({ canWrite, onDirtyChange }: { canWrite: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const settings = useCreditSettings();
  const list = usePilotWorkspaces();
  const add = useAddPilotWorkspace();
  const remove = useRemovePilotWorkspace();
  const restrict = useSetPilotRestriction();
  const [form, setForm] = useState({ organizationId: '', note: '' });
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<PilotWorkspace | null>(null);
  const [toggling, setToggling] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const dirty = form.organizationId !== '' || form.note !== '';
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  if (list.isError) return <LoadFailed error={list.error} what="the pilot workspaces" onRetry={() => void list.refetch()} />;
  if (list.isLoading || settings.isLoading || !list.data || !settings.data) return <Skeleton className="h-56 w-full" />;
  const restricted = settings.data.pilot.restricted;

  const submit = () => {
    const parsed = workspaceIdSchema.safeParse(form);
    if (!parsed.success) return setProblems(fieldErrors(parsed.error));
    setProblems({});
    add.mutate(
      { organizationId: parsed.data.organizationId.toLowerCase(), note: parsed.data.note },
      {
        onSuccess: () => {
          setForm({ organizationId: '', note: '' });
          setNotice({ message: 'The workspace was added to the pilot.', tone: 'success' });
        },
        onError: (error) => setNotice({ message: apiErrorMessage(error, 'The workspace could not be added.'), tone: 'error' }),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pilot workspaces</CardTitle>
        <CardDescription>Credits are counted only for these workspaces while the restriction is on. Everything else about credits is the same for every workspace: there are no per-workspace markups or conversions.</CardDescription>
        <div className="flex flex-wrap items-center gap-3">
          <Switch id="pilot-restricted" aria-label="Restrict credits to the pilot" checked={restricted} disabled={!canWrite || restrict.isPending} onCheckedChange={(next) => { restrict.reset(); setToggling(next); }} />
          <Label htmlFor="pilot-restricted">Restrict credit modes to the pilot allowlist</Label>
          <Badge variant={restricted ? 'warning' : 'secondary'}>{restricted ? 'Restricted' : 'Not restricted: every workspace follows its mode'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        {list.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workspace is in the pilot.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Added by</TableHead>
                <TableHead>Added</TableHead>
                {canWrite && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((row) => (
                <TableRow key={row.organizationId}>
                  <TableCell>
                    <p className="font-medium">{row.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{row.organizationId}</p>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{row.note ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{shortId(row.addedBy)}</TableCell>
                  <TableCell>{formatWhen(row.addedAt)}</TableCell>
                  {canWrite && (
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${row.name} from the pilot`} onClick={() => { remove.reset(); setRemoving(row); }}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {canWrite && (
          <form className="space-y-3 border-t border-border pt-4" noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
            <p className="text-sm font-medium">Add a workspace</p>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="pilot-id">Workspace ID</Label>
                <Input id="pilot-id" value={form.organizationId} placeholder="e.g. 018f0000-0000-7000-8000-000000000001" autoComplete="off" onChange={(event) => setForm({ ...form, organizationId: event.target.value })} />
                <Problem>{problems.organizationId}</Problem>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pilot-note">Note (optional)</Label>
                <Input id="pilot-note" value={form.note} placeholder="e.g. first pilot shop" autoComplete="off" onChange={(event) => setForm({ ...form, note: event.target.value })} />
                <Problem>{problems.note}</Problem>
              </div>
              <Button type="submit" disabled={add.isPending}>
                Add to pilot
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">The ID is on the workspace’s page under Organizations. A workspace that does not exist, or is already listed, is refused.</p>
          </form>
        )}
      </CardContent>

      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || remove.isPending ? undefined : setRemoving(null))}
          title={`Remove ${removing.name} from the pilot?`}
          description={restricted ? 'The restriction is on: this workspace will no longer be counted in credits.' : 'The restriction is off, so this changes nothing until it is turned on.'}
          confirmLabel="Remove from pilot"
          destructive
          isPending={remove.isPending}
          onConfirm={() => remove.mutate(removing.organizationId, { onSuccess: () => { setRemoving(null); setNotice({ message: 'The workspace was removed from the pilot.', tone: 'success' }); } })}
        >
          {remove.error ? <Problem>{apiErrorMessage(remove.error, 'The workspace could not be removed.')}</Problem> : null}
        </ConfirmDialog>
      )}

      {toggling !== null && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || restrict.isPending ? undefined : setToggling(null))}
          title={toggling ? 'Restrict credits to the pilot?' : 'Lift the pilot restriction?'}
          description={toggling ? 'Only the listed workspaces can be in a credit mode other than off. Every other workspace is treated as off.' : 'Every workspace goes back to its own mode, or the platform’s.'}
          confirmLabel={toggling ? 'Restrict' : 'Lift restriction'}
          destructive={!toggling}
          isPending={restrict.isPending}
          onConfirm={() => restrict.mutate({ expectedVersion: settings.data.version, enabled: toggling }, { onSuccess: () => { setToggling(null); setNotice({ message: toggling ? 'Credits are now restricted to the pilot.' : 'The pilot restriction was lifted.', tone: 'success' }); } })}
        >
          {restrict.error ? <Problem>{apiErrorMessage(restrict.error, 'The restriction could not be changed.')}</Problem> : null}
        </ConfirmDialog>
      )}
    </Card>
  );
}
