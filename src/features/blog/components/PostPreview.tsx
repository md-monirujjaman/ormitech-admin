import { ArrowRight, CalendarDays, Clock, ExternalLink, Monitor, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { env } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { bodyText, headingsOf, readingMinutes, type BlogDraft } from '../seo';
import { DocView } from './DocView';
import { SearchPreview } from './SearchPreview';

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * The article as a reader will see it, with the changes not yet saved. The website draws it the same way, so
 * headings, the answer box, the contents list, the FAQ and the closing button are all here.
 */
export function PostPreview({ open, onOpenChange, draft, previewPath }: { open: boolean; onOpenChange: (open: boolean) => void; draft: BlogDraft; previewPath: string | null }) {
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [view, setView] = useState<'article' | 'search'>('article');
  const headings = headingsOf(draft.content);
  const text = bodyText(draft.content);
  const when = draft.publishedAt ? dateFormat.format(new Date(draft.publishedAt)) : 'Not published yet';
  const faq = draft.faq.filter((item) => item.question.trim() && item.answer.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-6xl flex-col gap-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-5 py-3 pr-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle>Preview</DialogTitle>
              <DialogDescription>Your latest changes, saved or not. Nothing is published by looking at this.</DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="What to preview">
                {(['article', 'search'] as const).map((option) => (
                  <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={cn('rounded px-3 py-1 text-sm', view === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                    {option === 'article' ? 'Article' : 'Search & share'}
                  </button>
                ))}
              </div>
              {view === 'article' && (
                <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Screen size">
                  <Button type="button" size="icon" variant={width === 'desktop' ? 'secondary' : 'ghost'} className="size-7" aria-label="Desktop width" aria-pressed={width === 'desktop'} onClick={() => setWidth('desktop')}>
                    <Monitor className="size-4" aria-hidden />
                  </Button>
                  <Button type="button" size="icon" variant={width === 'mobile' ? 'secondary' : 'ghost'} className="size-7" aria-label="Phone width" aria-pressed={width === 'mobile'} onClick={() => setWidth('mobile')}>
                    <Smartphone className="size-4" aria-hidden />
                  </Button>
                </div>
              )}
              {previewPath && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`${env.webUrl.replace(/\/+$/, '')}${previewPath}`} target="_blank" rel="noreferrer noopener">
                    <ExternalLink className="size-4" aria-hidden />
                    Open on the website
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
          {view === 'search' ? (
            <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-5">
              <SearchPreview draft={draft} />
            </div>
          ) : (
            <article className={cn('mx-auto rounded-xl border border-border bg-background px-5 py-8 transition-all sm:px-10', width === 'mobile' ? 'max-w-[390px]' : 'max-w-3xl')} lang={draft.lang}>
              <p className="text-sm text-primary">
                {draft.category || 'General'}
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {when}
                </span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden />
                  {readingMinutes(text)} min read
                </span>
              </p>
              <h1 className={cn('mt-3 font-bold tracking-tight', width === 'mobile' ? 'text-3xl' : 'text-4xl')}>{draft.title || 'Untitled article'}</h1>
              {draft.excerpt && <p className="mt-3 text-lg text-muted-foreground">{draft.excerpt}</p>}
              <p className="mt-3 text-sm text-muted-foreground">By {draft.authorName || 'OrmiTech Team'}</p>
              {draft.coverImageUrl && <img src={draft.coverImageUrl} alt={draft.coverImageAlt} className="mt-6 h-auto w-full rounded-xl border border-border" />}

              {draft.answer.trim() && (
                <p className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 text-base leading-7">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">The short answer</span>
                  {draft.answer}
                </p>
              )}

              {draft.keyTakeaways.length > 0 && (
                <div className="mt-6 rounded-xl border border-border p-5">
                  <p className="text-sm font-semibold">Key takeaways</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-primary">
                    {draft.keyTakeaways.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {headings.length >= 3 && (
                <nav aria-label="Contents" className="mt-6 rounded-xl border border-border p-5">
                  <p className="text-sm font-semibold">In this article</p>
                  <ol className="mt-2 space-y-1.5 text-sm">
                    {headings.map((heading) => (
                      <li key={heading.id} className={cn(heading.level === 3 && 'pl-4')}>
                        <a href={`#${heading.id}`} className="text-muted-foreground hover:text-foreground">
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              <div className="mt-6 text-base leading-8 text-muted-foreground">
                <DocView doc={draft.content} />
              </div>

              {faq.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-2xl font-semibold tracking-tight">{draft.lang === 'bn' ? 'প্রশ্নোত্তর' : 'Frequently asked questions'}</h2>
                  <dl className="mt-4 space-y-5">
                    {faq.map((item, index) => (
                      <div key={index}>
                        <dt className="font-semibold">{item.question}</dt>
                        <dd className="mt-1 text-muted-foreground">{item.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {draft.cta && draft.cta.text && draft.cta.label && (
                <aside className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6">
                  <p className="text-base leading-7">{draft.cta.text}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
                      {draft.cta.label}
                      <ArrowRight className="size-4" aria-hidden />
                    </span>
                    {draft.cta.secondaryLabel && <span className="inline-flex items-center rounded-full border border-border px-5 py-2 text-sm font-medium">{draft.cta.secondaryLabel}</span>}
                  </div>
                </aside>
              )}
            </article>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
