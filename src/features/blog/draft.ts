import { EMPTY_DOC, type BlogDraft } from './seo';
import type { BlogPost, BlogPostInput } from './types';

export const emptyDraft = (): BlogDraft => ({
  title: '',
  slug: '',
  excerpt: '',
  content: EMPTY_DOC,
  category: 'General',
  tags: [],
  authorName: 'OrmiTech Team',
  lang: 'en',
  coverImageUrl: null,
  coverImageAlt: '',
  coverImageWidth: null,
  coverImageHeight: null,
  seoTitle: '',
  metaDescription: '',
  focusKeyword: '',
  keywords: [],
  canonicalUrl: '',
  ogImageUrl: null,
  noindex: false,
  answer: '',
  keyTakeaways: [],
  faq: [],
  cta: null,
  publishedAt: null,
});

export const draftFromPost = (post: BlogPost): BlogDraft => ({
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt,
  content: post.content,
  category: post.category,
  tags: post.tags,
  authorName: post.authorName,
  lang: post.lang,
  coverImageUrl: post.coverImageUrl,
  coverImageAlt: post.coverImageAlt ?? '',
  coverImageWidth: post.coverImageWidth,
  coverImageHeight: post.coverImageHeight,
  seoTitle: post.seoTitle ?? '',
  metaDescription: post.metaDescription ?? '',
  focusKeyword: post.focusKeyword ?? '',
  keywords: post.keywords,
  canonicalUrl: post.canonicalUrl ?? '',
  ogImageUrl: post.ogImageUrl,
  noindex: post.noindex,
  answer: post.answer ?? '',
  keyTakeaways: post.keyTakeaways,
  faq: post.faq,
  cta: post.cta,
  publishedAt: post.publishedAt,
});

const blank = (value: string) => value.trim() || null;

/** The draft in the shape the API takes. Half-filled questions and call-to-actions are left out, not sent broken. */
export function inputFromDraft(draft: BlogDraft): BlogPostInput & { title: string } {
  const cta = draft.cta && draft.cta.text.trim() && draft.cta.label.trim() && draft.cta.href.trim() ? { ...draft.cta, text: draft.cta.text.trim(), label: draft.cta.label.trim(), href: draft.cta.href.trim() } : null;
  if (cta && !(cta.secondaryLabel?.trim() && cta.secondaryHref?.trim())) {
    delete cta.secondaryLabel;
    delete cta.secondaryHref;
  }
  return {
    title: draft.title.trim(),
    ...(draft.slug.trim() ? { slug: draft.slug.trim() } : {}),
    excerpt: draft.excerpt.trim(),
    content: draft.content,
    category: draft.category.trim() || 'General',
    tags: draft.tags,
    authorName: draft.authorName.trim() || 'OrmiTech Team',
    lang: draft.lang,
    coverImageUrl: draft.coverImageUrl,
    coverImageAlt: blank(draft.coverImageAlt),
    coverImageWidth: draft.coverImageWidth,
    coverImageHeight: draft.coverImageHeight,
    seoTitle: blank(draft.seoTitle),
    metaDescription: blank(draft.metaDescription),
    focusKeyword: blank(draft.focusKeyword),
    keywords: draft.keywords,
    canonicalUrl: blank(draft.canonicalUrl),
    ogImageUrl: draft.ogImageUrl,
    noindex: draft.noindex,
    answer: blank(draft.answer),
    keyTakeaways: draft.keyTakeaways.map((item) => item.trim()).filter(Boolean),
    faq: draft.faq.map((item) => ({ question: item.question.trim(), answer: item.answer.trim() })).filter((item) => item.question && item.answer),
    cta,
  };
}

/** Only the fields whose value differs between what is saved and the draft. */
export function changedFields(saved: BlogPostInput, next: BlogPostInput): BlogPostInput {
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(next) as Array<keyof BlogPostInput>) {
    if (JSON.stringify(saved[key] ?? null) !== JSON.stringify(next[key] ?? null)) changes[key] = next[key] ?? null;
  }
  return changes as BlogPostInput;
}

/** `datetime-local` wants local time without a zone; the API wants an ISO instant. */
export const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
export const fromLocalInput = (value: string): string | null => (value ? new Date(value).toISOString() : null);

/** The input without the body: the body is compared by whether it was edited, because the editor's own JSON carries
 * attributes (link targets, column widths) that the API drops, so a saved body never equals the editor's byte for byte. */
export function withoutContent<T extends BlogPostInput>(input: T): Omit<T, 'content'> {
  const copy = { ...input };
  delete copy.content;
  return copy;
}
