import { Clock, ImageIcon, Megaphone, MessageSquareText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import { AnnouncementDialog } from '../components/AnnouncementDialog';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement, useUpdateAnnouncement } from '../hooks';
import { describeSpan, formatWhen, timeLeft } from '../schedule';
import type { Announcement, AnnouncementKind, AnnouncementPhase } from '../types';

const PHASE: Record<AnnouncementPhase, { label: string; variant: 'success' | 'default' | 'secondary' | 'outline' }> = {
  live: { label: 'Live now', variant: 'success' },
  scheduled: { label: 'Scheduled', variant: 'default' },
  ended: { label: 'Ended', variant: 'secondary' },
  off: { label: 'Switched off', variant: 'outline' },
};

const WHERE = (item: Announcement) => (item.targets.length === 2 ? 'Dashboard and website' : item.targets[0] === 'website' ? 'Website' : 'Client dashboard');

/**
 * Banners under the dashboard greeting and pop-ups on the dashboard and the website, written here and shown by the
 * apps while they are live. Each has a start and an end time and an on/off switch.
 */
export default function AnnouncementsPage() {
  const { can } = usePermissions();
  const canWrite = can('announcements.write');
  const query = useAnnouncements();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const remove = useDeleteAnnouncement();

  const [dialog, setDialog] = useState<{ editing: Announcement | null; kind: AnnouncementKind } | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  const items = query.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Messages and pop-ups for the client dashboard and the website. Pick the dates; they show and stop by themselves."
        showMockNotice={false}
        actions={
          canWrite && (
            <>
              <Button variant="outline" onClick={() => setDialog({ editing: null, kind: 'banner' })}>
                <MessageSquareText className="size-4" aria-hidden />
                New banner message
              </Button>
              <Button onClick={() => setDialog({ editing: null, kind: 'popup' })}>
                <Plus className="size-4" aria-hidden />
                New pop-up
              </Button>
            </>
          )
        }
      />

      {query.isError ? (
        <ErrorState title="Couldn't load announcements" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description={canWrite ? 'Add a banner message for the dashboard, or a pop-up with a picture and buttons.' : 'Nothing has been announced yet.'}
        />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const phase = PHASE[item.phase];
            const left = item.phase === 'live' ? timeLeft(item.endsAt) : '';
            return (
              <Card key={item.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 text-muted-foreground">
                  {item.kind === 'popup' && item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : item.kind === 'popup' ? <ImageIcon className="size-6" aria-hidden /> : <MessageSquareText className="size-6" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{item.title || (item.kind === 'popup' ? 'Pop-up' : 'Banner')}</h3>
                    <Badge variant={phase.variant}>{phase.label}</Badge>
                    <Badge variant="outline">{item.kind === 'popup' ? 'Pop-up' : 'Banner'}</Badge>
                  </div>
                  {item.body && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{item.body}</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{WHERE(item)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden />
                      {formatWhen(item.startsAt)} → {formatWhen(item.endsAt)} ({describeSpan(item.startsAt, item.endsAt)})
                    </span>
                    {left && <span className="font-medium text-emerald-600 dark:text-emerald-400">Ends in {left}</span>}
                    {item.buttons.length > 0 && <span>{item.buttons.length} {item.buttons.length === 1 ? 'button' : 'buttons'}</span>}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={item.enabled}
                        disabled={update.isPending}
                        aria-label={item.enabled ? 'Switch off' : 'Switch on'}
                        onCheckedChange={(enabled) => update.mutate({ id: item.id, input: { enabled } })}
                      />
                      {item.enabled ? 'On' : 'Off'}
                    </label>
                    <Button variant="outline" size="sm" onClick={() => setDialog({ editing: item, kind: item.kind })}>
                      <Pencil className="size-4" aria-hidden />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        remove.reset();
                        setDeleting(item);
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
          {update.error != null && <p className="text-xs text-destructive">{apiErrorMessage(update.error, 'The change could not be saved.')}</p>}
        </div>
      )}

      <AnnouncementDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            create.reset();
            update.reset();
          }
        }}
        editing={dialog?.editing ?? null}
        startKind={dialog?.kind ?? 'banner'}
        isPending={create.isPending || update.isPending}
        error={create.error ?? update.error}
        onSubmit={async (input) => {
          try {
            if (dialog?.editing) await update.mutateAsync({ id: dialog.editing.id, input });
            else await create.mutateAsync(input);
            setDialog(null);
          } catch {
            // Shown inside the dialog.
          }
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete announcement"
        description={deleting ? `“${deleting.title || (deleting.kind === 'popup' ? 'Pop-up' : 'Banner')}” will stop showing and be deleted. This cannot be undone.` : ''}
        confirmLabel="Delete"
        destructive
        isPending={remove.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            setDeleting(null);
          } catch {
            // Shown below.
          }
        }}
      >
        {remove.error != null && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{apiErrorMessage(remove.error, 'The OrmiTech API refused the deletion.')}</p>}
      </ConfirmDialog>
    </div>
  );
}
