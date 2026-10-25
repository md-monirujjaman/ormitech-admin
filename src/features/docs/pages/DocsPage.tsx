import { BookOpen, ChevronDown, FilePlus, FolderPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import { NewPageDialog, SectionDialog, type SectionFormValues } from '../components/DocDialogs';
import { DocsTree } from '../components/DocsTree';
import { PageEditor } from '../components/PageEditor';
import {
  useCreatePage,
  useCreateSection,
  useDeletePage,
  useDeleteSection,
  useDocPage,
  useDocsTree,
  useReorderDocs,
  useUpdateSection,
} from '../hooks';
import type { DocPageMeta, DocSectionNode } from '../types';

const EMPTY_SECTION: SectionFormValues = { title: '', slug: '', icon: null, parentId: null, status: 'draft' };

/** Every section, flattened, with a label that shows where a sub-section sits. */
function flatten(sections: DocSectionNode[]): { id: string; label: string }[] {
  return sections.flatMap((section) => [
    { id: section.id, label: section.title },
    ...section.children.map((child) => ({ id: child.id, label: `${section.title} › ${child.title}` })),
  ]);
}

function findPage(sections: DocSectionNode[], id: string): DocPageMeta | null {
  for (const section of sections) {
    const page = section.pages.find((candidate) => candidate.id === id) ?? findPage(section.children, id);
    if (page) return page;
  }
  return null;
}

/** The new order of `list` after moving `item` one place, or null when it is already at that end. */
function moved<T extends { id: string }>(list: T[], item: T, direction: -1 | 1): string[] | null {
  const ids = list.map((entry) => entry.id);
  const from = ids.indexOf(item.id);
  const to = from + direction;
  const a = ids[from];
  const b = ids[to];
  if (a === undefined || b === undefined) return null;
  ids[from] = b;
  ids[to] = a;
  return ids;
}

/**
 * The documentation, written here and shown on the public docs site. Sections and pages are created, ordered,
 * edited and published from this screen; pictures are stored in the platform's own storage (under `docs/`), apart
 * from any customer's data. Drafts are only ever visible here.
 */
export default function DocsPage() {
  const { can } = usePermissions();
  const canWrite = can('docs.write');

  const tree = useDocsTree();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);
  const page = useDocPage(selectedId);

  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const createPage = useCreatePage();
  const deletePage = useDeletePage();
  const reorder = useReorderDocs();

  const [sectionDialog, setSectionDialog] = useState<{ editing: DocSectionNode | null; initial: SectionFormValues } | null>(null);
  const [pageDialog, setPageDialog] = useState<{ sectionId: string | null } | null>(null);
  const [deletingSection, setDeletingSection] = useState<DocSectionNode | null>(null);
  const [deletingPage, setDeletingPage] = useState(false);

  const sections = useMemo(() => tree.data ?? [], [tree.data]);
  const flat = useMemo(() => flatten(sections), [sections]);

  const select = (id: string) => {
    if (id === selectedId) return;
    if (dirty && !window.confirm('You have unsaved changes on this page. Leave without saving?')) return;
    setDirty(false);
    setSelectedId(id);
    // The tree gets out of the way once a page is open, so the editor has the room.
    setTreeOpen(false);
  };

  const pageGone = selectedId !== null && tree.data !== undefined && findPage(sections, selectedId) === null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentation"
        description="Write, order and publish the public documentation. Drafts stay hidden until you publish them."
        showMockNotice={false}
        actions={
          canWrite && (
            <>
              <Button variant="outline" onClick={() => setSectionDialog({ editing: null, initial: EMPTY_SECTION })}>
                <FolderPlus className="size-4" aria-hidden />
                New section
              </Button>
              <Button disabled={flat.length === 0} onClick={() => setPageDialog({ sectionId: null })}>
                <FilePlus className="size-4" aria-hidden />
                New page
              </Button>
            </>
          )
        }
      />

      {tree.isError ? (
        <ErrorState
          title="Couldn't load the documentation"
          description={apiErrorMessage(tree.error, 'The OrmiTech API refused the request.')}
          onRetry={() => tree.refetch()}
        />
      ) : tree.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : sections.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No documentation yet"
          description={canWrite ? 'Start with a section, such as “Getting started”, then add pages to it.' : 'Nothing has been written yet.'}
        />
      ) : (
        <div className="space-y-4">
          <Card className="p-3">
            <button
              type="button"
              className="mb-2 flex w-full items-center justify-between text-left text-sm font-medium"
              aria-expanded={treeOpen}
              onClick={() => setTreeOpen(!treeOpen)}
            >
              <span>Sections and pages</span>
              <ChevronDown className={`size-4 transition-transform ${treeOpen ? '' : '-rotate-90'}`} aria-hidden />
            </button>
            {treeOpen && (
              <div className="max-h-72 overflow-y-auto">
            <DocsTree
              sections={sections}
              actions={{
                selectedPageId: selectedId,
                canWrite,
                onSelectPage: select,
                onAddPage: (sectionId) => setPageDialog({ sectionId }),
                onAddSubsection: (parent) => setSectionDialog({ editing: null, initial: { ...EMPTY_SECTION, parentId: parent.id } }),
                onEditSection: (section) =>
                  setSectionDialog({
                    editing: section,
                    initial: { title: section.title, slug: section.slug, icon: section.icon, parentId: section.parentId, status: section.status },
                  }),
                onDeleteSection: setDeletingSection,
                onMoveSection: (section, siblings, direction) => {
                  const ids = moved(siblings, section, direction);
                  if (ids) reorder.mutate({ kind: 'section', parentId: section.parentId, ids });
                },
                onMovePage: (pageMeta, section, direction) => {
                  const ids = moved(section.pages, pageMeta, direction);
                  if (ids) reorder.mutate({ kind: 'page', parentId: section.id, ids });
                },
              }}
            />
              </div>
            )}
            {reorder.error != null && <p className="mt-2 text-xs text-destructive">{apiErrorMessage(reorder.error, 'The order could not be saved.')}</p>}
          </Card>

          <div className="min-w-0">
            {selectedId === null || pageGone ? (
              <EmptyState
                icon={BookOpen}
                title="Choose a page"
                description={canWrite ? 'Pick a page on the left to edit it, or add a new one.' : 'Pick a page on the left to read it.'}
              />
            ) : page.isError ? (
              <ErrorState
                title="Couldn't load this page"
                description={apiErrorMessage(page.error, 'The OrmiTech API refused the request.')}
                onRetry={() => page.refetch()}
              />
            ) : page.data ? (
              <PageEditor
                key={page.data.id}
                page={page.data}
                canWrite={canWrite}
                sections={flat}
                onDirtyChange={setDirty}
                onSaved={() => undefined}
                onDelete={() => {
                  deletePage.reset();
                  setDeletingPage(true);
                }}
              />
            ) : (
              <Skeleton className="h-96 w-full" />
            )}
          </div>
        </div>
      )}

      <SectionDialog
        open={sectionDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSectionDialog(null);
            createSection.reset();
            updateSection.reset();
          }
        }}
        initial={sectionDialog?.initial ?? EMPTY_SECTION}
        editing={sectionDialog?.editing != null}
        topLevelSections={sections.filter((section) => section.id !== sectionDialog?.editing?.id)}
        isPending={createSection.isPending || updateSection.isPending}
        error={createSection.error ?? updateSection.error}
        onSubmit={async (values) => {
          const editing = sectionDialog?.editing;
          try {
            if (editing) {
              await updateSection.mutateAsync({
                id: editing.id,
                input: {
                  title: values.title,
                  ...(values.slug && values.slug !== editing.slug ? { slug: values.slug } : {}),
                  icon: values.icon,
                  parentId: values.parentId,
                  status: values.status,
                },
              });
            } else {
              await createSection.mutateAsync({
                title: values.title,
                ...(values.slug ? { slug: values.slug } : {}),
                ...(values.icon ? { icon: values.icon } : {}),
                ...(values.parentId ? { parentId: values.parentId } : {}),
                status: values.status,
              });
            }
            setSectionDialog(null);
          } catch {
            // Shown inside the dialog.
          }
        }}
      />

      <NewPageDialog
        open={pageDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPageDialog(null);
            createPage.reset();
          }
        }}
        sections={flat}
        defaultSectionId={pageDialog?.sectionId ?? null}
        isPending={createPage.isPending}
        error={createPage.error}
        onSubmit={async (values) => {
          try {
            const created = await createPage.mutateAsync({
              sectionId: values.sectionId,
              title: values.title,
              ...(values.slug ? { slug: values.slug } : {}),
            });
            setPageDialog(null);
            setDirty(false);
            setSelectedId(created.id);
          } catch {
            // Shown inside the dialog.
          }
        }}
      />

      <ConfirmDialog
        open={deletingSection !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingSection(null);
        }}
        title="Delete section"
        description={
          deletingSection
            ? `“${deletingSection.title}” will be deleted together with every page and sub-section inside it. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete section"
        destructive
        isPending={deleteSection.isPending}
        onConfirm={async () => {
          if (!deletingSection) return;
          try {
            await deleteSection.mutateAsync(deletingSection.id);
            setDeletingSection(null);
          } catch {
            // Shown below.
          }
        }}
      >
        {deleteSection.error != null && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{apiErrorMessage(deleteSection.error, 'The OrmiTech API refused the deletion.')}</p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={deletingPage}
        onOpenChange={setDeletingPage}
        title="Delete page"
        description={page.data ? `“${page.data.title}” will be deleted from the docs. This cannot be undone.` : ''}
        confirmLabel="Delete page"
        destructive
        isPending={deletePage.isPending}
        onConfirm={async () => {
          if (!selectedId) return;
          try {
            await deletePage.mutateAsync(selectedId);
            setDeletingPage(false);
            setDirty(false);
            setSelectedId(null);
          } catch {
            // Shown below.
          }
        }}
      >
        {deletePage.error != null && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{apiErrorMessage(deletePage.error, 'The OrmiTech API refused the deletion.')}</p>
        )}
      </ConfirmDialog>
    </div>
  );
}
