import { useEffect, useRef, useState } from 'react';
import { Bold, Code, ExternalLink, Heading2, Heading3, ImagePlus, Italic, Link as LinkIcon, List, ListOrdered, Loader2, Trash2 } from 'lucide-react';
import { docsApi } from '@/api/docsApi';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/LoadingState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { IconPicker } from '@/features/docs/components/IconPicker';
import { MarkdownPreview } from '@/features/docs/components/MarkdownPreview';
import { slugFromTitle } from '@/features/docs/slug';
import { useDocPage, useDocsMutations } from '@/features/docs/hooks';
import { apiErrorMessage } from '@/lib/apiError';
import { env } from '@/lib/constants';
import type { DocPage, DocSection, DocStatus } from '@/types/docs';

interface Draft {
  title: string;
  slug: string;
  sectionId: string;
  description: string;
  icon: string | null;
  content: string;
  status: DocStatus;
}

const toDraft = (page: DocPage): Draft => ({
  title: page.title,
  slug: page.slug,
  sectionId: page.sectionId,
  description: page.description ?? '',
  icon: page.icon,
  content: page.content,
  status: page.status,
});

/** Every section, flattened with its parent's name, for the "Section" picker. */
function sectionOptions(sections: DocSection[]): Array<{ id: string; label: string }> {
  return sections.flatMap((section) => [
    { id: section.id, label: section.title },
    ...section.children.map((child) => ({ id: child.id, label: `${section.title} / ${child.title}` })),
  ]);
}

/** Edit one page: its details, its markdown (with a toolbar, image upload and a preview), and publish or delete it. */
export function PageEditor({ pageId, sections, onDeleted }: { pageId: string; sections: DocSection[]; onDeleted: () => void }) {
  const query = useDocPage(pageId);
  const { updatePage, deletePage } = useDocsMutations();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugTouched, setSlugTouched] = useState(true);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // A different page (or a fresh copy from the API after saving) replaces what is being edited.
  useEffect(() => {
    if (query.data) {
      setDraft(toDraft(query.data));
      setSlugTouched(true);
      setMessage(null);
      setConfirmDelete(false);
    }
  }, [query.data]);

  if (query.isError) return <ErrorState title="Couldn't load this page" description={apiErrorMessage(query.error, 'The page could not be loaded.')} onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data || !draft) return <LoadingState label="Loading page…" />;

  const page = query.data;
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(page));
  const options = sectionOptions(sections);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((previous) => (previous ? { ...previous, [key]: value } : previous));

  /** Wraps the selection (or puts a placeholder) in the textarea, and keeps the cursor useful. */
  function insert(before: string, after = '', placeholder = '') {
    const area = textarea.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end, value } = area;
    const selected = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    set('content', next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  async function upload(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const asset = await docsApi.uploadImage(file);
      insert(`\n\n![${asset.name.replace(/[[\]]/g, '')}](${asset.url})\n\n`);
    } catch (error) {
      setMessage({ tone: 'error', text: apiErrorMessage(error, 'The image could not be uploaded.') });
    } finally {
      setUploading(false);
    }
  }

  async function save(status?: DocStatus) {
    setMessage(null);
    try {
      await updatePage.mutateAsync({
        id: page.id,
        input: {
          title: draft!.title.trim(),
          slug: draft!.slug,
          sectionId: draft!.sectionId,
          description: draft!.description.trim() || null,
          icon: draft!.icon,
          content: draft!.content,
          status: status ?? draft!.status,
        },
      });
      setMessage({ tone: 'ok', text: status === 'published' ? 'Published.' : status === 'draft' ? 'Moved back to draft.' : 'Saved.' });
    } catch (error) {
      setMessage({ tone: 'error', text: apiErrorMessage(error, 'The page could not be saved.') });
    }
  }

  async function remove() {
    try {
      await deletePage.mutateAsync(page.id);
      onDeleted();
    } catch (error) {
      setMessage({ tone: 'error', text: apiErrorMessage(error, 'The page could not be deleted.') });
    }
  }

  const liveUrl = `${env.docsUrl}/docs/${page.path}`;
  const toolbar = [
    { label: 'Heading 2', icon: Heading2, run: () => insert('\n## ', '\n', 'Heading') },
    { label: 'Heading 3', icon: Heading3, run: () => insert('\n### ', '\n', 'Heading') },
    { label: 'Bold', icon: Bold, run: () => insert('**', '**', 'bold text') },
    { label: 'Italic', icon: Italic, run: () => insert('*', '*', 'italic text') },
    { label: 'Bulleted list', icon: List, run: () => insert('\n- ', '\n', 'item') },
    { label: 'Numbered list', icon: ListOrdered, run: () => insert('\n1. ', '\n', 'step') },
    { label: 'Code', icon: Code, run: () => insert('`', '`', 'code') },
    { label: 'Link', icon: LinkIcon, run: () => insert('[', '](https://)', 'link text') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">/docs/{page.path}</p>
          <p className="text-xs text-muted-foreground">
            {page.status === 'published' ? 'Published' : 'Draft'} · updated {new Date(page.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {page.status === 'published' && (
            <Button asChild variant="outline" size="sm">
              <a href={liveUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" aria-hidden /> View live
              </a>
            </Button>
          )}
          {page.status === 'published' ? (
            <Button variant="outline" size="sm" onClick={() => void save('draft')} disabled={updatePage.isPending}>
              Unpublish
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => void save('published')} disabled={updatePage.isPending || draft.title.trim() === ''}>
              Publish
            </Button>
          )}
          <Button size="sm" onClick={() => void save()} disabled={!dirty || updatePage.isPending || draft.title.trim() === ''}>
            {updatePage.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {message && (
        <p className={message.tone === 'error' ? 'rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive' : 'rounded-md bg-success/10 px-3 py-2 text-xs text-success'}>{message.text}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="page-title">Title</Label>
          <Input
            id="page-title"
            value={draft.title}
            maxLength={160}
            onChange={(event) => {
              set('title', event.target.value);
              if (!slugTouched) set('slug', slugFromTitle(event.target.value));
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="page-slug">URL name</Label>
          <Input
            id="page-slug"
            value={draft.slug}
            maxLength={80}
            onChange={(event) => {
              setSlugTouched(true);
              set('slug', event.target.value.toLowerCase());
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select value={draft.sectionId} onValueChange={(value) => set('sectionId', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="page-description">Short description</Label>
          <Input id="page-description" value={draft.description} maxLength={300} placeholder="One line shown under the title and in search" onChange={(event) => set('description', event.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Icon</Label>
          <IconPicker value={draft.icon} onChange={(value) => set('icon', value)} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Content (Markdown)</Label>
          <Tabs value={tab} onValueChange={(value) => setTab(value as 'write' | 'preview')}>
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {tab === 'write' ? (
          <>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border p-1" role="toolbar" aria-label="Formatting">
              {toolbar.map(({ label, icon: Icon, run }) => (
                <Button key={label} type="button" variant="ghost" size="icon" className="size-8" title={label} aria-label={label} onClick={run}>
                  <Icon className="size-4" aria-hidden />
                </Button>
              ))}
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
                {uploading ? 'Uploading…' : 'Image'}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void upload(file);
                }}
              />
            </div>
            <Textarea ref={textarea} value={draft.content} onChange={(event) => set('content', event.target.value)} rows={22} className="font-mono text-xs" placeholder="Write the page in Markdown…" />
            <p className="text-xs text-muted-foreground">Headings (## and ###) become the “On this page” list on the docs site. Images up to 5 MB.</p>
          </>
        ) : (
          <div className="min-h-[20rem] rounded-lg border border-border p-4">
            <MarkdownPreview content={draft.content} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete this page for good?</span>
            <Button variant="destructive" size="sm" onClick={() => void remove()} disabled={deletePage.isPending}>
              {deletePage.isPending ? 'Deleting…' : 'Delete'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-3.5" aria-hidden /> Delete page
          </Button>
        )}
      </div>
    </div>
  );
}
