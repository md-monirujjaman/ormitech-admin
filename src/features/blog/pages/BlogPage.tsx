import { CalendarClock, ExternalLink, ImageIcon, Newspaper, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import { env, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useBlogPosts, useDeleteBlogPost } from '../hooks';
import type { BlogPostSummary, BlogState } from '../types';

const STATE: Record<BlogState, { label: string; variant: 'success' | 'default' | 'secondary' }> = {
  published: { label: 'Published', variant: 'success' },
  scheduled: { label: 'Scheduled', variant: 'default' },
  draft: { label: 'Draft', variant: 'secondary' },
};

const FILTERS: Array<{ value: 'all' | BlogState; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Drafts' },
];

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const when = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : '—');

/**
 * The blog, written here and shown on the website. Articles are drafts until published, and a publish date in the
 * future schedules one. The website refreshes about a minute after a change.
 */
export default function BlogPage() {
  const { can } = usePermissions();
  const canWrite = can('blog.write');
  const navigate = useNavigate();
  const query = useBlogPosts({});
  const remove = useDeleteBlogPost();
  const [filter, setFilter] = useState<'all' | BlogState>('all');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<BlogPostSummary | null>(null);

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const counts = useMemo(
    () => ({ all: items.length, published: items.filter((i) => i.state === 'published').length, scheduled: items.filter((i) => i.state === 'scheduled').length, draft: items.filter((i) => i.state === 'draft').length }),
    [items],
  );
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => (filter === 'all' || item.state === filter) && (!needle || [item.title, item.category, item.slug].some((field) => field.toLowerCase().includes(needle))));
  }, [items, filter, search]);

  const liveUrl = (item: BlogPostSummary) => `${env.webUrl.replace(/\/+$/, '')}/blog/${item.slug}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        description="Write articles for the website blog, set their search and answer-engine details, preview them, then publish or schedule."
        showMockNotice={false}
        actions={
          canWrite && (
            <Button onClick={() => navigate(`${ROUTES.blog}/new`)}>
              <Plus className="size-4" aria-hidden />
              New article
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1" role="group" aria-label="Filter by status">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn('rounded-md px-3 py-1.5 text-sm transition-colors', filter === option.value ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {option.label}
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{counts[option.value]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input className="pl-9" placeholder="Search title, category or address" aria-label="Search articles" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      {query.isError ? (
        <ErrorState title="Couldn't load the blog" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No articles yet"
          description={canWrite ? 'The website blog shows only what is published here. Write the first article.' : 'Nothing has been written yet.'}
          action={
            canWrite && (
              <Button onClick={() => navigate(`${ROUTES.blog}/new`)}>
                <Plus className="size-4" aria-hidden />
                New article
              </Button>
            )
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState icon={Search} title="No article matches" description="Try another word, or switch the status filter." />
      ) : (
        <div className="grid gap-3">
          {shown.map((item) => {
            const state = STATE[item.state];
            return (
              <Card key={item.id} className="flex flex-wrap items-center gap-4 p-4">
                <Link to={`${ROUTES.blog}/${item.id}`} className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 text-muted-foreground" aria-hidden tabIndex={-1}>
                  {item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className="size-full object-cover" /> : <ImageIcon className="size-6" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`${ROUTES.blog}/${item.id}`} className="truncate text-sm font-semibold hover:underline">
                      {item.title}
                    </Link>
                    <Badge variant={state.variant}>{state.label}</Badge>
                    <Badge variant="outline">{item.category}</Badge>
                  </div>
                  {item.excerpt && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{item.excerpt}</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>/blog/{item.slug}</span>
                    {item.state === 'scheduled' ? (
                      <span className="inline-flex items-center gap-1 font-medium text-primary">
                        <CalendarClock className="size-3" aria-hidden />
                        Goes live {when(item.publishedAt)}
                      </span>
                    ) : item.state === 'published' ? (
                      <span>Published {when(item.publishedAt)}</span>
                    ) : null}
                    <span>Edited {when(item.updatedAt)}</span>
                    <span>{item.readingMinutes} min read</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.state === 'published' && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={liveUrl(item)} target="_blank" rel="noreferrer noopener">
                        <ExternalLink className="size-4" aria-hidden />
                        View
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`${ROUTES.blog}/${item.id}`}>
                      <Pencil className="size-4" aria-hidden />
                      {canWrite ? 'Edit' : 'Open'}
                    </Link>
                  </Button>
                  {canWrite && (
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
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this article?"
        description={deleting ? `"${deleting.title}" is removed for good. If it is published, its page on the website stops working.` : ''}
        confirmLabel="Delete article"
        destructive
        isPending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      >
        {remove.isError && <p className="text-sm text-destructive">{apiErrorMessage(remove.error, 'The article could not be deleted.')}</p>}
      </ConfirmDialog>
    </div>
  );
}
