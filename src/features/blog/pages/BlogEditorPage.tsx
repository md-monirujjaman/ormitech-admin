import { ArrowLeft, CalendarClock, Eye, ImagePlus, Loader2, Save, Send, Trash2, Undo2 } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import { env, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { BlogEditor } from '../components/BlogEditor';
import { ChecklistCard } from '../components/ChecklistCard';
import { Counter, ChipInput, FaqEditor, LineList } from '../components/ListFields';
import { PostPreview } from '../components/PostPreview';
import { SearchPreview } from '../components/SearchPreview';
import { changedFields, draftFromPost, emptyDraft, fromLocalInput, inputFromDraft, toLocalInput, withoutContent } from '../draft';
import { useBlogPost, useBlogPosts, useCreateBlogPost, useDeleteBlogPost, useUpdateBlogPost, useUploadBlogImage } from '../hooks';
import { aeoChecks, bodyText, readingMinutes, score, seoChecks, slugify, wordCount, type BlogDraft } from '../seo';
import type { BlogPost } from '../types';

type Tab = 'write' | 'seo' | 'aeo';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: 'write', label: 'Article', hint: 'Title, summary and body' },
  { id: 'seo', label: 'Search (SEO)', hint: 'Google, Bing and link previews' },
  { id: 'aeo', label: 'Answers (AEO)', hint: 'AI assistants and featured answers' },
];

function Field({ id, label, hint, right, children }: { id: string; label: string; hint?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {right}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Loads an image file to learn its size, so the website can reserve its space and the page does not jump. */
function measure(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    image.src = url;
  });
}

/**
 * Writes one article: the body in the TipTap editor, the details a search engine reads, the details an answer
 * engine reads, a preview of the result, and Save / Publish / Schedule. The route id `new` starts a fresh article;
 * the first save creates it and the page continues at its own address.
 */
export default function BlogEditorPage() {
  const { id = 'new' } = useParams();
  const isNew = id === 'new';
  const post = useBlogPost(isNew ? null : id);

  if (!isNew && post.isError) {
    return (
      <ErrorState
        title="Couldn't open this article"
        description={apiErrorMessage(post.error, 'It may have been deleted.')}
        onRetry={() => post.refetch()}
      />
    );
  }
  if (!isNew && (post.isLoading || !post.data)) return <Skeleton className="h-[70vh] w-full" />;
  // Keyed, so opening another article starts from what the server has for it.
  return <Editor key={isNew ? 'new' : id} initial={isNew ? null : (post.data as BlogPost)} />;
}

function Editor({ initial }: { initial: BlogPost | null }) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canWrite = can('blog.write');
  const create = useCreateBlogPost();
  const update = useUpdateBlogPost();
  const remove = useDeleteBlogPost();
  const upload = useUploadBlogImage();
  const categories = useBlogPosts({}).data?.categories ?? [];

  const [saved, setSaved] = useState<BlogPost | null>(initial);
  const [draft, setDraft] = useState<BlogDraft>(() => (initial ? draftFromPost(initial) : emptyDraft()));
  const [tab, setTab] = useState<Tab>('write');
  const [slugTouched, setSlugTouched] = useState(initial !== null);
  // Set when the body is edited, cleared on save. See withoutContent for why the body is not compared field by field.
  const [contentChanged, setContentChanged] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const socialInput = useRef<HTMLInputElement>(null);

  const patch = (changes: Partial<BlogDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setNotice(null);
  };

  // The saved article as the API takes it, to tell what changed. A new article has nothing saved yet.
  const savedInput = useMemo(() => (saved ? withoutContent(inputFromDraft(draftFromPost(saved))) : null), [saved]);
  const deferred = useDeferredValue(draft);
  const draftInput = useMemo(() => withoutContent(inputFromDraft(deferred)), [deferred]);
  const changes = useMemo(() => (savedInput ? changedFields(savedInput, draftInput) : null), [savedInput, draftInput]);
  const publishChanged = saved !== null && (saved.publishedAt ?? null) !== (deferred.publishedAt ?? null);
  const dirty = saved ? contentChanged || Object.keys(changes ?? {}).length > 0 || publishChanged : draft.title.trim() !== '' || wordCount(bodyText(draft.content)) > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const state = saved?.state ?? 'draft';
  const text = bodyText(draft.content);
  const seo = useMemo(() => seoChecks(deferred), [deferred]);
  const aeo = useMemo(() => aeoChecks(deferred), [deferred]);
  const busy = create.isPending || update.isPending;
  const publishAt = draft.publishedAt ? new Date(draft.publishedAt) : null;
  const inFuture = publishAt !== null && publishAt.getTime() > Date.now();

  const uploadForBody = async (file: File) => (await upload.mutateAsync(file)).url;

  const addCover = async (file: File, kind: 'cover' | 'social') => {
    setImageError(null);
    if (!IMAGE_TYPES.includes(file.type)) return setImageError('Choose a JPEG, PNG, WebP or GIF image.');
    if (file.size > MAX_IMAGE_BYTES) return setImageError('Images can be up to 5 MB.');
    try {
      const [asset, size] = await Promise.all([upload.mutateAsync(file), measure(file)]);
      if (kind === 'cover') patch({ coverImageUrl: asset.url, coverImageWidth: size.width || null, coverImageHeight: size.height || null, coverImageAlt: draft.coverImageAlt || draft.title });
      else patch({ ogImageUrl: asset.url });
    } catch (failure) {
      setImageError(apiErrorMessage(failure, 'The image could not be uploaded.'));
    }
  };

  /** Saves the draft; `status` also publishes or unpublishes in the same step. */
  const save = async (status?: 'draft' | 'published') => {
    setError(null);
    setNotice(null);
    if (!draft.title.trim()) {
      setTab('write');
      return setError('Give the article a title first.');
    }
    const input = inputFromDraft(draft);
    try {
      let result: BlogPost;
      if (!saved) {
        result = await create.mutateAsync({ ...input, ...(status ? { status } : {}), ...(draft.publishedAt ? { publishedAt: draft.publishedAt } : {}) });
        setNotice(status === 'published' ? 'Published.' : 'Draft saved.');
        setSaved(result);
        setDraft(draftFromPost(result));
        navigate(`${ROUTES.blog}/${result.id}`, { replace: true });
        return;
      }
      const diff = savedInput ? changedFields(savedInput, withoutContent(input)) : input;
      const body = { ...diff, ...(contentChanged ? { content: draft.content } : {}), ...(status ? { status } : {}), ...(publishChanged || status === 'published' ? { publishedAt: draft.publishedAt } : {}) };
      if (Object.keys(body).length === 0) return;
      result = await update.mutateAsync({ id: saved.id, input: body });
      setSaved(result);
      setContentChanged(false);
      setDraft((current) => ({ ...draftFromPost(result), content: current.content }));
      setNotice(status === 'published' ? (result.state === 'scheduled' ? 'Scheduled.' : 'Published.') : status === 'draft' ? 'Unpublished. It is hidden from the website.' : result.state === 'draft' ? 'Draft saved.' : 'Saved. The website updates within a minute.');
    } catch (failure) {
      setError(apiErrorMessage(failure, 'The article could not be saved.'));
    }
  };

  const goBack = () => (dirty && canWrite ? setConfirmLeave(true) : navigate(ROUTES.blog));

  const publishLabel = state === 'published' ? 'Save changes' : inFuture ? 'Schedule' : 'Publish';
  const siteUrl = env.webUrl.replace(/\/+$/, '');
  const url = `${siteUrl}/blog/${draft.slug || slugify(draft.title) || '…'}`;

  return (
    <div className="space-y-5">
      <div className="sticky top-14 z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Back to the blog" onClick={goBack}>
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold">{draft.title.trim() || 'New article'}</h2>
              <Badge variant={state === 'published' ? 'success' : state === 'scheduled' ? 'default' : 'secondary'}>{state === 'published' ? 'Published' : state === 'scheduled' ? 'Scheduled' : 'Draft'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {dirty ? <span className="text-warning">Unsaved changes</span> : notice ?? (saved ? 'All changes saved' : 'Not saved yet')} · {wordCount(text)} words · {readingMinutes(text)} min read
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="size-4" aria-hidden />
            Preview
          </Button>
          {canWrite && (
            <>
              {state !== 'draft' && (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => save('draft')}>
                  <Undo2 className="size-4" aria-hidden />
                  Unpublish
                </Button>
              )}
              {state === 'draft' && (
                <Button variant="outline" size="sm" disabled={busy || !dirty} onClick={() => save()}>
                  <Save className="size-4" aria-hidden />
                  Save draft
                </Button>
              )}
              <Button size="sm" disabled={busy || (state !== 'draft' && !dirty)} onClick={() => (state === 'draft' ? save('published') : save())}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : state === 'draft' && inFuture ? <CalendarClock className="size-4" aria-hidden /> : state === 'draft' ? <Send className="size-4" aria-hidden /> : <Save className="size-4" aria-hidden />}
                {publishLabel}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          <div role="tablist" aria-label="Article sections" className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {TABS.map((item) => {
              const value = item.id === 'seo' ? score(seo) : item.id === 'aeo' ? score(aeo) : null;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  title={item.hint}
                  onClick={() => setTab(item.id)}
                  className={cn('inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm transition-colors', tab === item.id ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                >
                  {item.label}
                  {value !== null && <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums', value >= 80 ? 'bg-success/15 text-success' : value >= 50 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive')}>{value}</span>}
                </button>
              );
            })}
          </div>

          {/* The tabs are hidden, not removed: the editor keeps its undo history and cursor while another tab is open. */}
          <section hidden={tab !== 'write'} className="space-y-5">
            <Card className="space-y-4 p-5">
              <Field id="blog-title" label="Title" right={<Counter value={draft.title.length} max={200} />}>
                <Input
                  id="blog-title"
                  className="h-12 text-lg font-semibold"
                  value={draft.title}
                  maxLength={200}
                  disabled={!canWrite}
                  placeholder="What is an omnichannel inbox?"
                  onChange={(event) => patch({ title: event.target.value, ...(slugTouched ? {} : { slug: slugify(event.target.value) }) })}
                />
              </Field>
              <Field id="blog-excerpt" label="Summary" hint="Shown on the blog cards and under the title. Two sentences at most." right={<Counter value={draft.excerpt.length} max={400} />}>
                <Textarea id="blog-excerpt" rows={3} value={draft.excerpt} maxLength={400} disabled={!canWrite} placeholder="A short summary that makes someone want to read on." onChange={(event) => patch({ excerpt: event.target.value })} />
              </Field>
            </Card>
            <BlogEditor value={draft.content} canWrite={canWrite} onUploadImage={uploadForBody} onChange={(content) => {
                patch({ content });
                setContentChanged(true);
              }}
            />
          </section>

          <section hidden={tab !== 'seo'} className="space-y-5">
            <Card className="space-y-4 p-5">
              <div>
                <h3 className="text-sm font-semibold">Search engines</h3>
                <p className="text-xs text-muted-foreground">What Google and Bing show for this article. Empty fields fall back to the title and summary.</p>
              </div>
              <Field id="blog-keyword" label="Focus keyword" hint="The one phrase people would type to find this article. Use it in the title, the first paragraph and a sub-heading.">
                <Input id="blog-keyword" value={draft.focusKeyword} maxLength={100} disabled={!canWrite} placeholder="omnichannel inbox" onChange={(event) => patch({ focusKeyword: event.target.value })} />
              </Field>
              <Field id="blog-seo-title" label="SEO title" hint="Up to about 60 characters. Leave empty to use the article title." right={<Counter value={draft.seoTitle.length} min={30} max={60} />}>
                <Input id="blog-seo-title" value={draft.seoTitle} maxLength={120} disabled={!canWrite} placeholder={draft.title || 'Same as the title'} onChange={(event) => patch({ seoTitle: event.target.value })} />
              </Field>
              <Field id="blog-meta" label="Meta description" hint="120 to 158 characters. Say what the reader gets, and include the focus keyword." right={<Counter value={draft.metaDescription.length} min={120} max={158} />}>
                <Textarea id="blog-meta" rows={3} value={draft.metaDescription} maxLength={320} disabled={!canWrite} placeholder={draft.excerpt || 'Same as the summary'} onChange={(event) => patch({ metaDescription: event.target.value })} />
              </Field>
              <ChipInput id="blog-keywords" label="Related keywords" values={draft.keywords} max={20} disabled={!canWrite} placeholder="Type a phrase and press Enter" onChange={(keywords) => patch({ keywords })} />
              <Field id="blog-slug" label="Web address (slug)" hint={saved?.state === 'published' ? 'Careful: changing the address of a published article breaks links to the old one.' : 'Lowercase letters, digits and hyphens. Short is better.'}>
                <div className="flex items-center rounded-md border border-input bg-background text-sm focus-within:ring-2 focus-within:ring-ring">
                  <span className="shrink-0 pl-3 text-muted-foreground">/blog/</span>
                  <input
                    id="blog-slug"
                    className="h-9 w-full min-w-0 bg-transparent px-1 py-1 outline-none"
                    value={draft.slug}
                    disabled={!canWrite}
                    maxLength={100}
                    onChange={(event) => {
                      setSlugTouched(true);
                      patch({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-') });
                    }}
                    onBlur={() => patch({ slug: draft.slug.replace(/^-+|-+$/g, '') })}
                  />
                </div>
              </Field>
              <Field id="blog-canonical" label="Canonical address" hint="Only if this article first appeared somewhere else. Leave empty and the page uses its own address.">
                <Input id="blog-canonical" type="url" value={draft.canonicalUrl} disabled={!canWrite} placeholder={url} onChange={(event) => patch({ canonicalUrl: event.target.value })} />
              </Field>
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="blog-noindex">Hide from search engines</Label>
                  <p className="text-xs text-muted-foreground">Adds “noindex”. The page still opens for anyone with the link, but search engines leave it out.</p>
                </div>
                <Switch id="blog-noindex" checked={draft.noindex} disabled={!canWrite} onCheckedChange={(noindex) => patch({ noindex })} />
              </div>
              <div>
                <Label>Picture for shared links</Label>
                <p className="text-xs text-muted-foreground">Shown when the link is posted on social media or in chat. The cover picture is used when this is empty. 1200 × 630 works best.</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {draft.ogImageUrl && <img src={draft.ogImageUrl} alt="" className="h-16 rounded-md border border-border" />}
                  {canWrite && (
                    <>
                      <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => socialInput.current?.click()}>
                        <ImagePlus className="size-4" aria-hidden />
                        {draft.ogImageUrl ? 'Replace' : 'Upload picture'}
                      </Button>
                      {draft.ogImageUrl && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => patch({ ogImageUrl: null })}>
                          Remove
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <SearchPreview draft={draft} />
            </Card>
            <ChecklistCard title="Search checklist" description="Advice to help the article rank. None of it stops you from publishing." checks={seo} />
          </section>

          <section hidden={tab !== 'aeo'} className="space-y-5">
            <Card className="space-y-5 p-5">
              <div>
                <h3 className="text-sm font-semibold">Answer engines</h3>
                <p className="text-xs text-muted-foreground">Assistants like ChatGPT, Gemini and Google’s AI answers quote pages that state a clear answer, list the key points and answer real questions. Fill these in and the page says so in a way they can read.</p>
              </div>
              <Field id="blog-answer" label="Direct answer" hint="One to three sentences that answer the main question on their own, as if no one reads further. 30 to 60 words. Shown in a box at the top." right={<span className="text-xs tabular-nums text-muted-foreground">{wordCount(draft.answer)} words</span>}>
                <Textarea id="blog-answer" rows={4} value={draft.answer} maxLength={800} disabled={!canWrite} placeholder="An omnichannel inbox puts messages from every channel in one place, so a team answers each customer once, with the full history in view." onChange={(event) => patch({ answer: event.target.value })} />
              </Field>
              <LineList label="Key takeaways" hint="Three to six short points that sum up the article." values={draft.keyTakeaways} max={10} disabled={!canWrite} placeholder="One place for every message" onChange={(keyTakeaways) => patch({ keyTakeaways })} />
              <div>
                <p className="text-sm font-medium">Questions and answers (FAQ)</p>
                <p className="mb-2 text-xs text-muted-foreground">Real questions readers ask. They are shown at the end of the article and published as FAQ structured data.</p>
                <FaqEditor items={draft.faq} disabled={!canWrite} onChange={(faq) => patch({ faq })} />
              </div>
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="blog-cta-on">Closing call to action</Label>
                    <p className="text-xs text-muted-foreground">A short message and a button at the end of the article.</p>
                  </div>
                  <Switch id="blog-cta-on" checked={draft.cta !== null} disabled={!canWrite} onCheckedChange={(on) => patch({ cta: on ? { text: '', label: '', href: '' } : null })} />
                </div>
                {draft.cta && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field id="cta-text" label="Message">
                        <Textarea id="cta-text" rows={2} value={draft.cta.text} maxLength={400} disabled={!canWrite} onChange={(event) => patch({ cta: { ...draft.cta!, text: event.target.value } })} />
                      </Field>
                    </div>
                    <Field id="cta-label" label="Button text">
                      <Input id="cta-label" value={draft.cta.label} maxLength={40} disabled={!canWrite} placeholder="Get started" onChange={(event) => patch({ cta: { ...draft.cta!, label: event.target.value } })} />
                    </Field>
                    <Field id="cta-href" label="Button goes to" hint="A full address, or a path like /pricing">
                      <Input id="cta-href" value={draft.cta.href} disabled={!canWrite} placeholder="/pricing" onChange={(event) => patch({ cta: { ...draft.cta!, href: event.target.value } })} />
                    </Field>
                    <Field id="cta-label2" label="Second button text (optional)">
                      <Input id="cta-label2" value={draft.cta.secondaryLabel ?? ''} maxLength={40} disabled={!canWrite} onChange={(event) => patch({ cta: { ...draft.cta!, secondaryLabel: event.target.value } })} />
                    </Field>
                    <Field id="cta-href2" label="Second button goes to">
                      <Input id="cta-href2" value={draft.cta.secondaryHref ?? ''} disabled={!canWrite} onChange={(event) => patch({ cta: { ...draft.cta!, secondaryHref: event.target.value } })} />
                    </Field>
                  </div>
                )}
              </div>
            </Card>
            <ChecklistCard title="Answer checklist" description="Is the article easy for an assistant to quote? Advice only." checks={aeo} />
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-[8.5rem] xl:self-start">
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Publishing</h3>
            <div className="text-sm text-muted-foreground">
              {state === 'published' ? 'Live on the website.' : state === 'scheduled' ? 'Scheduled. It goes live on the date below.' : 'A draft. Only people with the preview link can read it.'}
            </div>
            <Field id="blog-publish-at" label={state === 'draft' ? 'Publish on (optional)' : 'Published on'} hint={state === 'draft' ? 'Leave empty to publish as soon as you press Publish. A later date schedules it.' : undefined}>
              <Input id="blog-publish-at" type="datetime-local" value={toLocalInput(draft.publishedAt)} disabled={!canWrite} onChange={(event) => patch({ publishedAt: fromLocalInput(event.target.value) })} />
            </Field>
            {saved && (
              <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                <p>Preview address (private):</p>
                <a href={`${siteUrl}${saved.previewPath}`} target="_blank" rel="noreferrer noopener" className="block truncate text-primary underline underline-offset-2">
                  {siteUrl}
                  {saved.previewPath}
                </a>
                {state === 'published' && (
                  <a href={`${siteUrl}/blog/${saved.slug}`} target="_blank" rel="noreferrer noopener" className="block truncate text-primary underline underline-offset-2">
                    View live article
                  </a>
                )}
              </div>
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Details</h3>
            <Field id="blog-category" label="Category">
              <Input id="blog-category" list="blog-categories" value={draft.category} maxLength={60} disabled={!canWrite} onChange={(event) => patch({ category: event.target.value })} />
              <datalist id="blog-categories">
                {categories.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>
            <ChipInput id="blog-tags" label="Tags" values={draft.tags} max={12} disabled={!canWrite} placeholder="Press Enter to add" onChange={(tags) => patch({ tags })} />
            <Field id="blog-author" label="Author">
              <Input id="blog-author" value={draft.authorName} maxLength={80} disabled={!canWrite} onChange={(event) => patch({ authorName: event.target.value })} />
            </Field>
            <Field id="blog-lang" label="Language">
              <Select value={draft.lang} disabled={!canWrite} onValueChange={(lang) => patch({ lang: lang as 'en' | 'bn' })}>
                <SelectTrigger id="blog-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">বাংলা (Bangla)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Card>

          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Cover picture</h3>
            {draft.coverImageUrl ? (
              <img src={draft.coverImageUrl} alt={draft.coverImageAlt} className="w-full rounded-lg border border-border" />
            ) : (
              <button type="button" disabled={!canWrite} onClick={() => coverInput.current?.click()} className="grid aspect-[1.91/1] w-full place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/40">
                <span className="flex items-center gap-2">
                  <ImagePlus className="size-4" aria-hidden />
                  Upload a cover picture
                </span>
              </button>
            )}
            {draft.coverImageUrl && (
              <>
                <Field id="blog-cover-alt" label="Describe the picture (alt text)" hint="For screen readers and search. Say what it shows.">
                  <Input id="blog-cover-alt" value={draft.coverImageAlt} maxLength={300} disabled={!canWrite} onChange={(event) => patch({ coverImageAlt: event.target.value })} />
                </Field>
                {canWrite && (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => coverInput.current?.click()}>
                      Replace
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => patch({ coverImageUrl: null, coverImageAlt: '', coverImageWidth: null, coverImageHeight: null })}>
                      Remove
                    </Button>
                  </div>
                )}
              </>
            )}
            {upload.isPending && <p className="text-xs text-muted-foreground">Uploading…</p>}
            {imageError && <p className="text-xs text-destructive">{imageError}</p>}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Search', value: score(seo), tab: 'seo' as const },
              { label: 'Answers', value: score(aeo), tab: 'aeo' as const },
            ].map((item) => (
              <button key={item.label} type="button" onClick={() => setTab(item.tab)} className="rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/40">
                <span className="text-xs text-muted-foreground">{item.label} score</span>
                <span className={cn('block text-2xl font-semibold tabular-nums', item.value >= 80 ? 'text-success' : item.value >= 50 ? 'text-warning' : 'text-destructive')}>{item.value}</span>
              </button>
            ))}
          </div>

          {saved && canWrite && (
            <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" aria-hidden />
              Delete article
            </Button>
          )}
        </aside>
      </div>

      <input
        ref={coverInput}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void addCover(file, 'cover');
        }}
      />
      <input
        ref={socialInput}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void addCover(file, 'social');
        }}
      />

      <PostPreview open={previewOpen} onOpenChange={setPreviewOpen} draft={draft} previewPath={saved?.previewPath ?? null} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this article?"
        description="It is removed for good. If it is published, its page on the website stops working."
        confirmLabel="Delete article"
        destructive
        isPending={remove.isPending}
        onConfirm={() => saved && remove.mutate(saved.id, { onSuccess: () => navigate(ROUTES.blog) })}
      >
        {remove.isError && <p className="text-sm text-destructive">{apiErrorMessage(remove.error, 'The article could not be deleted.')}</p>}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave without saving?"
        description="You have changes that are not saved. They will be lost."
        confirmLabel="Leave"
        destructive
        onConfirm={() => navigate(ROUTES.blog)}
      />
      <Link to={ROUTES.blog} className="sr-only">
        Back to the blog
      </Link>
    </div>
  );
}
