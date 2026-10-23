import { useState } from 'react';
import { BookOpen, FolderPlus } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { DocTree } from '@/features/docs/components/DocTree';
import { PageEditor } from '@/features/docs/components/PageEditor';
import { SectionDialog } from '@/features/docs/components/SectionDialog';
import { useDocsMutations, useDocsTree } from '@/features/docs/hooks';
import { apiErrorMessage } from '@/lib/apiError';
import { env } from '@/lib/constants';
import type { DocSection } from '@/types/docs';

type DialogState = { kind: 'section'; section?: DocSection; parentId?: string | null } | null;

/** Where an admin writes the documentation: the navigation tree on the left, the page being edited on the right. */
export default function DocsPage() {
  const tree = useDocsTree();
  const mutations = useDocsMutations();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DocSection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (tree.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Documentation" description="Write the pages of the public docs site." showMockNotice={false} />
        <ErrorState title="Couldn't load the documentation" description={apiErrorMessage(tree.error, 'Only a super admin can edit the documentation.')} onRetry={() => void tree.refetch()} />
      </div>
    );
  }
  if (tree.isLoading || !tree.data) return <LoadingState label="Loading documentation…" />;

  const sections = tree.data;
  const flat = sections.flatMap((section) => [section, ...section.children]);
  const total = flat.reduce((sum, section) => sum + section.pages.length, 0);

  async function addPage(section: DocSection) {
    setNotice(null);
    try {
      const page = await mutations.createPage.mutateAsync({ sectionId: section.id, title: 'Untitled page', slug: `untitled-${Date.now().toString(36)}` });
      setSelectedPageId(page.id);
    } catch (error) {
      setNotice(apiErrorMessage(error, 'The page could not be added.'));
    }
  }

  async function saveSection(input: Parameters<typeof mutations.createSection.mutateAsync>[0]) {
    setDialogError(null);
    try {
      if (dialog?.section) await mutations.updateSection.mutateAsync({ id: dialog.section.id, input });
      else await mutations.createSection.mutateAsync(input);
      setDialog(null);
    } catch (error) {
      setDialogError(apiErrorMessage(error, 'The section could not be saved.'));
    }
  }

  async function removeSection() {
    if (!deleting) return;
    const doomedPages = new Set([deleting, ...deleting.children].flatMap((section) => section.pages.map((page) => page.id)));
    try {
      await mutations.deleteSection.mutateAsync(deleting.id);
      if (selectedPageId && doomedPages.has(selectedPageId)) setSelectedPageId(null);
      setDeleting(null);
    } catch (error) {
      setDeleting(null);
      setNotice(apiErrorMessage(error, 'The section could not be deleted.'));
    }
  }

  const pageCount = deleting ? [deleting, ...deleting.children].reduce((sum, section) => sum + section.pages.length, 0) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentation"
        description="Sections and pages shown on the public docs site. Only published ones appear there."
        showMockNotice={false}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`${env.docsUrl}/docs`} target="_blank" rel="noreferrer">
                Open docs site
              </a>
            </Button>
            <Button size="sm" onClick={() => { setDialogError(null); setDialog({ kind: 'section', parentId: null }); }}>
              <FolderPlus className="size-4" aria-hidden /> New section
            </Button>
          </div>
        }
      />

      {notice && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{notice}</p>}

      {sections.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No documentation yet"
          description="Add a section, then add pages to it. Write in Markdown, add images, and publish when it is ready."
          action={
            <Button onClick={() => { setDialogError(null); setDialog({ kind: 'section', parentId: null }); }}>
              <FolderPlus className="size-4" aria-hidden /> New section
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <Card className="self-start">
            <CardContent className="p-3">
              <p className="px-1.5 pb-2 text-xs text-muted-foreground">
                {sections.length} section{sections.length === 1 ? '' : 's'} · {total} page{total === 1 ? '' : 's'}
              </p>
              <DocTree
                tree={sections}
                selectedPageId={selectedPageId}
                onSelectPage={setSelectedPageId}
                onAddPage={(section) => void addPage(section)}
                onAddSection={(parent) => { setDialogError(null); setDialog({ kind: 'section', parentId: parent?.id ?? null }); }}
                onEditSection={(section) => { setDialogError(null); setDialog({ kind: 'section', section }); }}
                onDeleteSection={setDeleting}
                onMove={(kind, parentId, ids) => mutations.reorder.mutate({ kind, parentId, ids }, { onError: (error) => setNotice(apiErrorMessage(error, 'The order could not be saved.')) })}
                busy={mutations.reorder.isPending}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              {selectedPageId && flat.some((section) => section.pages.some((page) => page.id === selectedPageId)) ? (
                <PageEditor key={selectedPageId} pageId={selectedPageId} sections={sections} onDeleted={() => setSelectedPageId(null)} />
              ) : (
                <EmptyState className="border-0" icon={BookOpen} title="Pick a page to edit" description="Choose a page in the list, or add one with the page button next to a section." />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <SectionDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        section={dialog?.section}
        defaultParentId={dialog?.parentId}
        topLevel={sections}
        isPending={mutations.createSection.isPending || mutations.updateSection.isPending}
        error={dialogError}
        onSubmit={(input) => void saveSection(input)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete “${deleting?.title ?? ''}”?`}
        description={`This deletes the section${pageCount > 0 ? ` and its ${pageCount} page${pageCount === 1 ? '' : 's'}` : ''}${deleting && deleting.children.length > 0 ? ', including its sub-sections' : ''} for good. It cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isPending={mutations.deleteSection.isPending}
        onConfirm={() => void removeSection()}
      />
    </div>
  );
}
