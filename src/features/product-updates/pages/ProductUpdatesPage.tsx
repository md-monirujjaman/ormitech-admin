import { Eye, EyeOff, ImageIcon, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import { ProductUpdateDialog } from '../components/ProductUpdateDialog';
import { formatReleaseDate, newTagNote } from '../format';
import { useCreateProductUpdate, useDeleteProductUpdate, useProductUpdates, useUpdateProductUpdate } from '../hooks';
import { categoryLabel, type ProductUpdate } from '../types';

/**
 * Product updates: the cards in "What's New" and the lines in the Changelog on the client dashboard. Entries start as
 * drafts; publishing shows them and starts the three days of the automatic NEW tag, which can be forced on or off.
 */
export default function ProductUpdatesPage() {
  const { can } = usePermissions();
  const canWrite = can('productupdates.write');
  const query = useProductUpdates();
  const create = useCreateProductUpdate();
  const update = useUpdateProductUpdate();
  const remove = useDeleteProductUpdate();

  const [dialog, setDialog] = useState<{ editing: ProductUpdate | null } | null>(null);
  const [deleting, setDeleting] = useState<ProductUpdate | null>(null);

  const items = query.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Updates"
        description="What's New and the Changelog in the client dashboard. Publish an entry and it shows with a NEW tag for three days."
        showMockNotice={false}
        actions={
          canWrite && (
            <Button onClick={() => setDialog({ editing: null })}>
              <Plus className="size-4" aria-hidden />
              New update
            </Button>
          )
        }
      />

      {query.isError ? (
        <ErrorState title="Couldn't load product updates" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <EmptyState icon={Sparkles} title="No product updates yet" description={canWrite ? 'Add the first one: a title, a picture, the version and the date.' : 'Nothing has been published yet.'} />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const published = item.status === 'published';
            return (
              <Card key={item.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 text-muted-foreground">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : <ImageIcon className="size-6" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{item.title}</h3>
                    <Badge variant={published ? 'success' : 'outline'}>{published ? 'Published' : 'Draft'}</Badge>
                    <Badge variant="secondary">{categoryLabel(item.category)}</Badge>
                    {item.isNew && <Badge>NEW</Badge>}
                  </div>
                  {item.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{item.description}</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{formatReleaseDate(item.releaseDate)}</span>
                    {item.version && <span>v{item.version}</span>}
                    <span>{newTagNote(item)}</span>
                    {item.changes.length > 0 && <span>{item.changes.length} {item.changes.length === 1 ? 'change' : 'changes'}</span>}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" disabled={update.isPending} onClick={() => update.mutate({ id: item.id, input: { status: published ? 'draft' : 'published' } })}>
                      {published ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                      {published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDialog({ editing: item })}>
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

      <ProductUpdateDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            create.reset();
            update.reset();
          }
        }}
        editing={dialog?.editing ?? null}
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
        title="Delete product update"
        description={deleting ? `“${deleting.title}” will disappear from What's New and the Changelog and be deleted. This cannot be undone.` : ''}
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
