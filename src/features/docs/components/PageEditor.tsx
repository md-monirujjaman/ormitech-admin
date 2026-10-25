import { Bold, Code, ExternalLink, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/apiError';
import { env } from '@/lib/constants';
import { useUpdatePage, useUploadDocImage } from '../hooks';
import type { DocPage, DocStatus, UpdatePageInput } from '../types';
import { IconField } from './IconField';
import { MarkdownPreview } from './MarkdownPreview';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface Draft {
  title: string;
  slug: string;
  description: string;
  icon: string | null;
  sectionId: string;
  content: string;
}

const toDraft = (page: DocPage): Draft => ({
  title: page.title,
  slug: page.slug,
  description: page.description ?? '',
  icon: page.icon,
  sectionId: page.sectionId,
  content: page.content,
});

/** What differs from the saved page, in the shape the API takes. Empty when nothing changed. */
function changesFrom(page: DocPage, draft: Draft): UpdatePageInput {
  const changes: UpdatePageInput = {};
  if (draft.title.trim() !== page.title) changes.title = draft.title.trim();
  if (draft.slug.trim() !== page.slug && draft.slug.trim() !== '') changes.slug = draft.slug.trim();
  if ((draft.description.trim() || null) !== page.description) changes.description = draft.description.trim() || null;
  if (draft.icon !== page.icon) changes.icon = draft.icon;
  if (draft.sectionId !== page.sectionId) changes.sectionId = draft.sectionId;
  if (draft.content !== page.content) changes.content = draft.content;
  return changes;
}

function isDirty(page: DocPage, draft: Draft): boolean {
  return Object.keys(changesFrom(page, draft)).length > 0;
}

/**
 * The page editor: details, markdown with a live preview, pictures, and Save / Publish.
 * Mounted once per page (keyed by the page id), so its draft starts from what the server has.
 */
export function PageEditor({
  page,
  canWrite,
  sections,
  onDelete,
  onDirtyChange,
  onSaved,
}: {
  page: DocPage;
  canWrite: boolean;
  sections: { id: string; label: string }[];
  onDelete: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: (page: DocPage) => void;
}) {
  const [saved, setSaved] = useState(page);
  const [draft, setDraftState] = useState<Draft>(() => toDraft(page));
  const [notice, setNotice] = useState<string | null>(null);
  const updatePage = useUpdatePage();
  const upload = useUploadDocImage();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const setDraft = (next: Draft) => {
    setDraftState(next);
    setNotice(null);
    onDirtyChange(isDirty(saved, next));
  };

  const dirty = isDirty(saved, draft);
  const published = saved.status === 'published';

  const save = async (status?: DocStatus) => {
    const changes: UpdatePageInput = { ...changesFrom(saved, draft), ...(status ? { status } : {}) };
    if (Object.keys(changes).length === 0) return;
    if (changes.title === '') return;
    try {
      const result = await updatePage.mutateAsync({ id: saved.id, input: changes });
      setSaved(result);
      setDraftState(toDraft(result));
      onDirtyChange(false);
      onSaved(result);
      setNotice(status === 'published' ? 'Published. It is now on the public docs site.' : status === 'draft' ? 'Unpublished. It is hidden from the public site.' : 'Saved.');
    } catch {
      // The API's reason is shown below the form.
    }
  };

  /** Replaces the selected text (or inserts at the cursor) and keeps the cursor sensible. */
  const edit = (transform: (selected: string) => { text: string; selectFrom?: number; selectTo?: number }) => {
    const el = textarea.current;
    if (!el || !canWrite) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const result = transform(draft.content.slice(start, end));
    const next = draft.content.slice(0, start) + result.text + draft.content.slice(end);
    setDraft({ ...draft, content: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + (result.selectFrom ?? result.text.length), start + (result.selectTo ?? result.text.length));
    });
  };

  const wrap = (before: string, after: string, placeholder: string) =>
    edit((selected) => {
      const inner = selected || placeholder;
      return { text: `${before}${inner}${after}`, selectFrom: before.length, selectTo: before.length + inner.length };
    });

  const linePrefix = (prefix: string, placeholder: string) =>
    edit((selected) => {
      const body = (selected || placeholder).split('\n').map((line, n) => (prefix === '1. ' ? `${n + 1}. ` : prefix) + line).join('\n');
      return { text: `\n${body}\n` };
    });

  const addImage = async (file: File) => {
    setUploadError(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setUploadError('Choose a JPEG, PNG, WebP or GIF image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError('Images can be up to 5 MB.');
      return;
    }
    try {
      const asset = await upload.mutateAsync(file);
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[[\]()]/g, '');
      edit(() => ({ text: `\n![${alt}](${asset.url})\n` }));
    } catch (error) {
      setUploadError(apiErrorMessage(error, 'The image could not be uploaded.'));
    }
  };

  const publicUrl = `${env.docsUrl.replace(/\/+$/, '')}/${saved.path}`;
  const toolbar = [
    { label: 'Bold', icon: Bold, run: () => wrap('**', '**', 'bold text') },
    { label: 'Italic', icon: Italic, run: () => wrap('*', '*', 'italic text') },
    { label: 'Heading', icon: Heading2, run: () => linePrefix('## ', 'Heading') },
    { label: 'Sub-heading', icon: Heading3, run: () => linePrefix('### ', 'Sub-heading') },
    { label: 'Bullet list', icon: List, run: () => linePrefix('- ', 'Item') },
    { label: 'Numbered list', icon: ListOrdered, run: () => linePrefix('1. ', 'Step') },
    { label: 'Quote', icon: Quote, run: () => linePrefix('> ', 'Note') },
    { label: 'Code', icon: Code, run: () => wrap('`', '`', 'code') },
    { label: 'Link', icon: Link2, run: () => edit((selected) => ({ text: `[${selected || 'link text'}](https://)`, selectFrom: 1, selectTo: 1 + (selected || 'link text').length })) },
  ];

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={published ? 'success' : 'secondary'}>{published ? 'Published' : 'Draft'}</Badge>
          {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>}
          {notice && !dirty && <span className="text-xs text-muted-foreground">{notice}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {published && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="size-4" aria-hidden />
                View live
              </a>
            </Button>
          )}
          {canWrite && (
            <>
              <Button variant="outline" size="sm" disabled={!dirty || updatePage.isPending || !draft.title.trim()} onClick={() => save()}>
                {updatePage.isPending ? 'Saving…' : 'Save'}
              </Button>
              {published ? (
                <Button variant="outline" size="sm" disabled={updatePage.isPending} onClick={() => save('draft')}>
                  Unpublish
                </Button>
              ) : null}
              <Button size="sm" disabled={updatePage.isPending || !draft.title.trim()} onClick={() => save('published')}>
                {published ? 'Save & publish' : 'Publish'}
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="size-4" aria-hidden />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5 xl:col-span-2">
          <Label htmlFor="doc-title">Title</Label>
          <Input id="doc-title" value={draft.title} maxLength={160} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doc-slug">URL name</Label>
          <Input id="doc-slug" value={draft.slug} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} />
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select value={draft.sectionId} disabled={!canWrite} onValueChange={(sectionId) => setDraft({ ...draft, sectionId })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="doc-description">Short description (shown in search and at the top)</Label>
          <Input id="doc-description" value={draft.description} maxLength={300} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Icon</Label>
          <IconField value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <Label>Write</Label>
          </div>
          {canWrite && (
            <div className="flex flex-wrap items-center gap-1">
              {toolbar.map(({ label, icon: Icon, run }) => (
                <Button key={label} type="button" variant="ghost" size="icon" className="size-8" aria-label={label} title={label} onClick={run}>
                  <Icon className="size-4" aria-hidden />
                </Button>
              ))}
              <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
                <ImagePlus className="size-4" aria-hidden />
                {upload.isPending ? 'Uploading…' : 'Add picture'}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept={IMAGE_TYPES.join(',')}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void addImage(file);
                }}
              />
            </div>
          )}
          <Textarea
            ref={textarea}
            value={draft.content}
            disabled={!canWrite}
            spellCheck
            className="h-[34rem] resize-none font-mono text-[13px] font-normal leading-relaxed"
            placeholder={'Write the page in markdown.\n\n## A heading\nSome text with **bold**, a [link](https://example.com), and a picture added with "Add picture".'}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            onPaste={(event) => {
              const file = Array.from(event.clipboardData.files).find((candidate) => candidate.type.startsWith('image/'));
              if (file && canWrite) {
                event.preventDefault();
                void addImage(file);
              }
            }}
            onDrop={(event) => {
              const file = Array.from(event.dataTransfer.files).find((candidate) => candidate.type.startsWith('image/'));
              if (file && canWrite) {
                event.preventDefault();
                void addImage(file);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">You can also paste or drop a picture straight into the text. JPEG, PNG, WebP or GIF, up to 5 MB.</p>
          {uploadError && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{uploadError}</p>}
        </div>

        <div className="min-w-0 space-y-2">
          <Label>Live preview</Label>
          <div className="h-[34rem] overflow-y-auto rounded-md border border-border bg-background p-4 lg:mt-10">
            {draft.title && <h1 className="mb-1 text-2xl font-semibold text-foreground">{draft.title}</h1>}
            {draft.description && <p className="mb-4 text-sm text-muted-foreground">{draft.description}</p>}
            <MarkdownPreview source={draft.content} />
          </div>
        </div>
      </div>

      {updatePage.error != null && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{apiErrorMessage(updatePage.error, 'The OrmiTech API refused the change.')}</p>
      )}
    </Card>
  );
}
