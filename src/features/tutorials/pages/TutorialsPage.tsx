import { ArrowDown, ArrowUp, GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { CategoryDialog, TutorialDialog } from '../components/TutorialDialogs';
import { useCreateCategory, useCreateTutorial, useDeleteCategory, useDeleteTutorial, useTutorials, useUpdateCategory, useUpdateTutorial } from '../hooks';
import type { Tutorial, TutorialCategory } from '../types';
import { thumbnailUrl } from '../youtube';

/**
 * The video tutorials clients see under Help > Tutorials on their dashboard: categories with a short line each, and the
 * YouTube videos in them. Each category and video has an on/off switch and a place in the order.
 */
export default function TutorialsPage() {
  const { can } = usePermissions();
  const canWrite = can('tutorials.write');
  const query = useTutorials();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createTutorial = useCreateTutorial();
  const updateTutorial = useUpdateTutorial();
  const deleteTutorial = useDeleteTutorial();

  const [categoryDialog, setCategoryDialog] = useState<{ editing: TutorialCategory | null } | null>(null);
  const [videoDialog, setVideoDialog] = useState<{ editing: Tutorial | null; categoryId: string | null } | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<TutorialCategory | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<Tutorial | null>(null);

  const categories = query.data ?? [];
  const reorderError = updateCategory.error ?? updateTutorial.error;

  // Swapping two neighbours' order numbers. The API keeps what it is given, so equal numbers (all zero) are first spread out.
  const moveCategory = async (index: number, direction: -1 | 1) => {
    const other = categories[index + direction];
    const current = categories[index];
    if (!other || !current) return;
    await Promise.all(categories.map((category, at) => updateCategory.mutateAsync({ id: category.id, input: { sortOrder: at === index ? index + direction : at === index + direction ? index : at } })));
  };
  const moveVideo = async (category: TutorialCategory, index: number, direction: -1 | 1) => {
    if (!category.tutorials[index + direction]) return;
    await Promise.all(category.tutorials.map((video, at) => updateTutorial.mutateAsync({ id: video.id, input: { sortOrder: at === index ? index + direction : at === index + direction ? index : at } })));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutorials"
        description="Video guides for the client dashboard (Help → Tutorials). Add a category, then paste YouTube links into it."
        showMockNotice={false}
        actions={
          canWrite && (
            <>
              <Button variant="outline" onClick={() => setCategoryDialog({ editing: null })}>
                <Plus className="size-4" aria-hidden />
                New category
              </Button>
              <Button disabled={categories.length === 0} onClick={() => setVideoDialog({ editing: null, categoryId: null })}>
                <Plus className="size-4" aria-hidden />
                New video
              </Button>
            </>
          )
        }
      />

      {query.isError ? (
        <ErrorState title="Couldn't load tutorials" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : categories.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No tutorials yet" description={canWrite ? 'Start with a category such as "Getting started", then add its videos.' : 'No tutorials have been added yet.'} />
      ) : (
        <div className="space-y-4">
          {categories.map((category, index) => (
            <Card key={category.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{category.title}</h3>
                    <Badge variant={category.enabled ? 'success' : 'outline'}>{category.enabled ? 'Shown' : 'Hidden'}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {category.tutorials.length} {category.tutorials.length === 1 ? 'video' : 'videos'}
                    </span>
                  </div>
                  {category.description && <p className="mt-0.5 text-sm text-muted-foreground">{category.description}</p>}
                </div>
                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" size="icon" aria-label="Move category up" disabled={index === 0 || updateCategory.isPending} onClick={() => void moveCategory(index, -1)}>
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Move category down" disabled={index === categories.length - 1 || updateCategory.isPending} onClick={() => void moveCategory(index, 1)}>
                      <ArrowDown className="size-4" aria-hidden />
                    </Button>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={category.enabled} disabled={updateCategory.isPending} aria-label={category.enabled ? 'Hide category' : 'Show category'} onCheckedChange={(enabled) => updateCategory.mutate({ id: category.id, input: { enabled } })} />
                      {category.enabled ? 'On' : 'Off'}
                    </label>
                    <Button variant="outline" size="sm" onClick={() => setVideoDialog({ editing: null, categoryId: category.id })}>
                      <Plus className="size-4" aria-hidden />
                      Video
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCategoryDialog({ editing: category })}>
                      <Pencil className="size-4" aria-hidden />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        deleteCategory.reset();
                        setDeletingCategory(category);
                      }}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {category.tutorials.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No videos in this category yet. It stays hidden from clients until it has one.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {category.tutorials.map((video, at) => (
                    <li key={video.id} className="flex flex-wrap items-center gap-4 p-4">
                      <img src={thumbnailUrl(video.youtubeId)} alt="" loading="lazy" className="aspect-video w-32 shrink-0 rounded-md border border-border bg-muted object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-medium">{video.title}</h4>
                          <Badge variant={video.enabled ? 'success' : 'outline'}>{video.enabled ? 'Shown' : 'Hidden'}</Badge>
                        </div>
                        {video.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{video.description}</p>}
                        <a className="mt-1 inline-block text-xs text-muted-foreground underline underline-offset-2" href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noreferrer">
                          youtube.com/watch?v={video.youtubeId}
                        </a>
                      </div>
                      {canWrite && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button variant="ghost" size="icon" aria-label="Move video up" disabled={at === 0 || updateTutorial.isPending} onClick={() => void moveVideo(category, at, -1)}>
                            <ArrowUp className="size-4" aria-hidden />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Move video down" disabled={at === category.tutorials.length - 1 || updateTutorial.isPending} onClick={() => void moveVideo(category, at, 1)}>
                            <ArrowDown className="size-4" aria-hidden />
                          </Button>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch checked={video.enabled} disabled={updateTutorial.isPending} aria-label={video.enabled ? 'Hide video' : 'Show video'} onCheckedChange={(enabled) => updateTutorial.mutate({ id: video.id, input: { enabled } })} />
                            {video.enabled ? 'On' : 'Off'}
                          </label>
                          <Button variant="outline" size="sm" onClick={() => setVideoDialog({ editing: video, categoryId: null })}>
                            <Pencil className="size-4" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              deleteTutorial.reset();
                              setDeletingVideo(video);
                            }}
                          >
                            <Trash2 className="size-4" aria-hidden />
                            Delete
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
          {reorderError != null && <p className="text-xs text-destructive">{apiErrorMessage(reorderError, 'The change could not be saved.')}</p>}
        </div>
      )}

      <CategoryDialog
        open={categoryDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryDialog(null);
            createCategory.reset();
            updateCategory.reset();
          }
        }}
        editing={categoryDialog?.editing ?? null}
        isPending={createCategory.isPending || updateCategory.isPending}
        error={createCategory.error ?? updateCategory.error}
        onSubmit={async (input) => {
          try {
            if (categoryDialog?.editing) await updateCategory.mutateAsync({ id: categoryDialog.editing.id, input });
            else await createCategory.mutateAsync(input);
            setCategoryDialog(null);
          } catch {
            // Shown inside the dialog.
          }
        }}
      />

      <TutorialDialog
        open={videoDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setVideoDialog(null);
            createTutorial.reset();
            updateTutorial.reset();
          }
        }}
        editing={videoDialog?.editing ?? null}
        categories={categories}
        startCategoryId={videoDialog?.categoryId ?? null}
        isPending={createTutorial.isPending || updateTutorial.isPending}
        error={createTutorial.error ?? updateTutorial.error}
        onSubmit={async (input) => {
          try {
            if (videoDialog?.editing) await updateTutorial.mutateAsync({ id: videoDialog.editing.id, input });
            else await createTutorial.mutateAsync(input);
            setVideoDialog(null);
          } catch {
            // Shown inside the dialog.
          }
        }}
      />

      <ConfirmDialog
        open={deletingCategory !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingCategory(null);
        }}
        title="Delete category"
        description={deletingCategory ? `“${deletingCategory.title}” and its ${deletingCategory.tutorials.length} ${deletingCategory.tutorials.length === 1 ? 'video' : 'videos'} will be deleted. This cannot be undone.` : ''}
        confirmLabel="Delete"
        destructive
        isPending={deleteCategory.isPending}
        onConfirm={async () => {
          if (!deletingCategory) return;
          try {
            await deleteCategory.mutateAsync(deletingCategory.id);
            setDeletingCategory(null);
          } catch {
            // Shown below.
          }
        }}
      >
        {deleteCategory.error != null && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{apiErrorMessage(deleteCategory.error, 'The OrmiTech API refused the deletion.')}</p>}
      </ConfirmDialog>

      <ConfirmDialog
        open={deletingVideo !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingVideo(null);
        }}
        title="Delete video"
        description={deletingVideo ? `“${deletingVideo.title}” will be removed from the tutorials. The YouTube video itself is not touched.` : ''}
        confirmLabel="Delete"
        destructive
        isPending={deleteTutorial.isPending}
        onConfirm={async () => {
          if (!deletingVideo) return;
          try {
            await deleteTutorial.mutateAsync(deletingVideo.id);
            setDeletingVideo(null);
          } catch {
            // Shown below.
          }
        }}
      >
        {deleteTutorial.error != null && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{apiErrorMessage(deleteTutorial.error, 'The OrmiTech API refused the deletion.')}</p>}
      </ConfirmDialog>
    </div>
  );
}
