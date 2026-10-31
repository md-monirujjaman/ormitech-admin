import type { BlogCta, BlogDoc, BlogFaqItem, BlogNode } from './types';

/** What an article is being edited as: every field the API takes, in the form the inputs use. */
export interface BlogDraft {
  title: string;
  slug: string;
  excerpt: string;
  content: BlogDoc;
  category: string;
  tags: string[];
  authorName: string;
  lang: 'en' | 'bn';
  coverImageUrl: string | null;
  coverImageAlt: string;
  coverImageWidth: number | null;
  coverImageHeight: number | null;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  keywords: string[];
  canonicalUrl: string;
  ogImageUrl: string | null;
  noindex: boolean;
  answer: string;
  keyTakeaways: string[];
  faq: BlogFaqItem[];
  cta: BlogCta | null;
  publishedAt: string | null;
}

export const EMPTY_DOC: BlogDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

/** A URL segment from a title: the same rule the API applies, so the field shows what will be saved. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}

const textOfNode = (node: BlogNode): string => (node.type === 'text' ? (node.text ?? '') : (node.content ?? []).map(textOfNode).join(node.type === 'paragraph' || node.type === 'heading' ? '' : ' '));

/** Readable text of the body, one block per line. */
export function bodyText(doc: BlogDoc): string {
  const lines: string[] = [];
  const walk = (node: BlogNode) => {
    if (['paragraph', 'heading', 'codeBlock', 'tableCell', 'tableHeader'].includes(node.type)) lines.push(textOfNode(node).trim());
    else for (const child of node.content ?? []) walk(child);
  };
  for (const node of doc.content ?? []) walk(node);
  return lines.filter(Boolean).join('\n');
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(text: string): number {
  return Math.max(1, Math.ceil(wordCount(text) / 200));
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export function headingsOf(doc: BlogDoc): Heading[] {
  const seen = new Map<string, number>();
  const result: Heading[] = [];
  for (const node of doc.content ?? []) {
    if (node.type !== 'heading') continue;
    const level = Number(node.attrs?.level ?? 2);
    const text = textOfNode(node).trim();
    if (!text) continue;
    const base = slugify(text) || 'section';
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    if (level <= 3) result.push({ level, text, id: count === 1 ? base : `${base}-${count}` });
  }
  return result;
}

function collect(doc: BlogDoc, pick: (node: BlogNode) => boolean): BlogNode[] {
  const found: BlogNode[] = [];
  const walk = (node: BlogNode) => {
    if (pick(node)) found.push(node);
    for (const child of node.content ?? []) walk(child);
  };
  for (const node of doc.content ?? []) walk(node);
  return found;
}

const links = (doc: BlogDoc): string[] =>
  collect(doc, (node) => node.type === 'text' && Boolean(node.marks?.some((mark) => mark.type === 'link'))).flatMap((node) => node.marks?.filter((mark) => mark.type === 'link').map((mark) => String(mark.attrs?.href ?? '')) ?? []);

export const images = (doc: BlogDoc): BlogNode[] => collect(doc, (node) => node.type === 'image');

function firstParagraph(doc: BlogDoc): string {
  for (const node of doc.content ?? []) {
    if (node.type === 'paragraph') {
      const text = textOfNode(node).trim();
      if (text) return text;
    }
  }
  return '';
}

export type CheckStatus = 'pass' | 'warn' | 'fail';
export interface Check {
  id: string;
  status: CheckStatus;
  label: string;
  hint?: string;
}

const lower = (text: string) => text.toLocaleLowerCase();
const has = (haystack: string, needle: string) => needle !== '' && lower(haystack).includes(lower(needle));

/** The title as it will show in search: the SEO title, or the article title when that is empty. */
export const effectiveTitle = (draft: BlogDraft) => draft.seoTitle.trim() || draft.title.trim();
/** The description as it will show in search: the meta description, the summary, or the direct answer. */
export const effectiveDescription = (draft: BlogDraft) => draft.metaDescription.trim() || draft.excerpt.trim() || draft.answer.trim();

/** Search checks. Advice, never a gate: an article can be published with any of these failing. */
export function seoChecks(draft: BlogDraft): Check[] {
  const checks: Check[] = [];
  const title = effectiveTitle(draft);
  const description = effectiveDescription(draft);
  const keyword = draft.focusKeyword.trim();
  const text = bodyText(draft.content);
  const words = wordCount(text);
  const headings = headingsOf(draft.content);
  const slugText = draft.slug.replace(/-/g, ' ');

  checks.push(
    keyword
      ? { id: 'keyword', status: 'pass', label: 'Focus keyword is set' }
      : { id: 'keyword', status: 'fail', label: 'Add a focus keyword', hint: 'The one phrase people would type to find this article.' },
  );
  if (title.length === 0) checks.push({ id: 'title', status: 'fail', label: 'Add a title' });
  else if (title.length < 30) checks.push({ id: 'title', status: 'warn', label: `Title is short (${title.length} characters)`, hint: 'Aim for 30 to 60 characters.' });
  else if (title.length > 60) checks.push({ id: 'title', status: 'warn', label: `Title may be cut off in search (${title.length} characters)`, hint: 'Aim for 60 characters or fewer.' });
  else checks.push({ id: 'title', status: 'pass', label: `Title length is good (${title.length})` });

  if (description.length === 0) checks.push({ id: 'description', status: 'fail', label: 'Add a meta description', hint: 'It is the text under the title in search results.' });
  else if (description.length < 110) checks.push({ id: 'description', status: 'warn', label: `Description is short (${description.length} characters)`, hint: 'Aim for 120 to 158 characters.' });
  else if (description.length > 160) checks.push({ id: 'description', status: 'warn', label: `Description may be cut off (${description.length} characters)`, hint: 'Aim for 158 characters or fewer.' });
  else checks.push({ id: 'description', status: 'pass', label: `Description length is good (${description.length})` });

  if (keyword) {
    checks.push(has(title, keyword) ? { id: 'kw-title', status: 'pass', label: 'Keyword is in the title' } : { id: 'kw-title', status: 'warn', label: 'Keyword is not in the title', hint: 'Put it near the start of the title.' });
    checks.push(has(description, keyword) ? { id: 'kw-description', status: 'pass', label: 'Keyword is in the description' } : { id: 'kw-description', status: 'warn', label: 'Keyword is not in the description' });
    checks.push(has(slugText, keyword.replace(/-/g, ' ')) ? { id: 'kw-slug', status: 'pass', label: 'Keyword is in the web address' } : { id: 'kw-slug', status: 'warn', label: 'Keyword is not in the web address', hint: 'Short addresses with the keyword do best.' });
    checks.push(has(firstParagraph(draft.content), keyword) ? { id: 'kw-intro', status: 'pass', label: 'Keyword is in the first paragraph' } : { id: 'kw-intro', status: 'warn', label: 'Keyword is not in the first paragraph' });
    checks.push(headings.some((heading) => has(heading.text, keyword)) ? { id: 'kw-heading', status: 'pass', label: 'Keyword is in a sub-heading' } : { id: 'kw-heading', status: 'warn', label: 'Keyword is not in any sub-heading' });
  }

  checks.push(
    draft.slug.length === 0
      ? { id: 'slug', status: 'fail', label: 'Add a web address (slug)' }
      : draft.slug.length > 60
        ? { id: 'slug', status: 'warn', label: `Web address is long (${draft.slug.length} characters)`, hint: 'Shorter is easier to share and read.' }
        : { id: 'slug', status: 'pass', label: 'Web address is short and clean' },
  );

  if (words < 300) checks.push({ id: 'length', status: words === 0 ? 'fail' : 'warn', label: `Article is short (${words} words)`, hint: 'Guides that answer the question fully usually run 600 words or more.' });
  else checks.push({ id: 'length', status: 'pass', label: `Article length is good (${words} words)` });

  checks.push(headings.length >= 2 ? { id: 'headings', status: 'pass', label: `${headings.length} sub-headings break up the text` } : { id: 'headings', status: 'warn', label: 'Add sub-headings', hint: 'Use Heading 2 and 3 to structure the article; they also feed the contents list.' });

  const hrefs = links(draft.content);
  checks.push(hrefs.some((href) => href.startsWith('/') || href.includes('ormitechit.com')) ? { id: 'internal', status: 'pass', label: 'Links to another page on the site' } : { id: 'internal', status: 'warn', label: 'No link to another page on the site', hint: 'Link to a product, pricing or related article page.' });
  if (hrefs.some((href) => /^https?:\/\//i.test(href) && !href.includes('ormitechit.com'))) checks.push({ id: 'external', status: 'pass', label: 'Links to an outside source' });

  const pictures = images(draft.content);
  const missingAlt = pictures.filter((node) => !String(node.attrs?.alt ?? '').trim()).length;
  if (missingAlt > 0) checks.push({ id: 'alt', status: 'fail', label: `${missingAlt} picture${missingAlt === 1 ? '' : 's'} without alt text`, hint: 'Click a picture in the editor and describe it.' });
  else if (pictures.length > 0) checks.push({ id: 'alt', status: 'pass', label: 'Every picture has alt text' });

  checks.push(
    draft.coverImageUrl
      ? draft.coverImageAlt.trim()
        ? { id: 'cover', status: 'pass', label: 'Cover picture with alt text' }
        : { id: 'cover', status: 'fail', label: 'Cover picture needs alt text' }
      : { id: 'cover', status: 'warn', label: 'No cover picture', hint: 'It becomes the picture shown when the link is shared.' },
  );
  return checks;
}

/** Answer-engine checks: is the article easy for an AI assistant or a featured snippet to quote? */
export function aeoChecks(draft: BlogDraft): Check[] {
  const checks: Check[] = [];
  const answerWords = wordCount(draft.answer);
  if (answerWords === 0) checks.push({ id: 'answer', status: 'fail', label: 'Add a direct answer', hint: 'One to three sentences that answer the main question on their own.' });
  else if (answerWords < 20) checks.push({ id: 'answer', status: 'warn', label: `Direct answer is very short (${answerWords} words)`, hint: 'Aim for 30 to 60 words.' });
  else if (answerWords > 80) checks.push({ id: 'answer', status: 'warn', label: `Direct answer is long (${answerWords} words)`, hint: 'Aim for 30 to 60 words so it can be quoted whole.' });
  else checks.push({ id: 'answer', status: 'pass', label: `Direct answer length is good (${answerWords} words)` });

  const keyword = draft.focusKeyword.trim();
  if (keyword && draft.answer.trim()) checks.push(has(draft.answer, keyword) ? { id: 'answer-kw', status: 'pass', label: 'Direct answer names the topic' } : { id: 'answer-kw', status: 'warn', label: 'Direct answer does not mention the focus keyword' });

  checks.push(draft.keyTakeaways.length >= 3 ? { id: 'takeaways', status: 'pass', label: `${draft.keyTakeaways.length} key takeaways` } : { id: 'takeaways', status: 'warn', label: 'Add at least 3 key takeaways', hint: 'Short bullet points that sum up the article.' });

  const filled = draft.faq.filter((item) => item.question.trim() && item.answer.trim());
  checks.push(filled.length >= 3 ? { id: 'faq', status: 'pass', label: `${filled.length} questions answered (published as FAQ data)` } : { id: 'faq', status: 'warn', label: 'Add at least 3 questions and answers', hint: 'Real questions people ask. They are published as FAQ structured data.' });

  const headings = collect(draft.content, (node) => node.type === 'heading');
  const asQuestions = headings.filter((node) => /\?\s*$/.test(textOfNode(node).trim())).length;
  checks.push(asQuestions >= 1 ? { id: 'question-headings', status: 'pass', label: `${asQuestions} sub-heading${asQuestions === 1 ? ' is' : 's are'} written as a question` } : { id: 'question-headings', status: 'warn', label: 'No sub-heading is a question', hint: 'For example "How does an omnichannel inbox work?"' });

  const structured = collect(draft.content, (node) => ['bulletList', 'orderedList', 'table'].includes(node.type)).length;
  checks.push(structured > 0 ? { id: 'structure', status: 'pass', label: 'Uses lists or a table' } : { id: 'structure', status: 'warn', label: 'No list or table', hint: 'Steps and comparisons are easy for assistants to lift.' });

  checks.push(draft.authorName.trim() ? { id: 'author', status: 'pass', label: 'Has an author' } : { id: 'author', status: 'warn', label: 'Add an author' });
  return checks;
}

export function score(checks: Check[]): number {
  if (checks.length === 0) return 0;
  const points = checks.reduce((sum, check) => sum + (check.status === 'pass' ? 1 : check.status === 'warn' ? 0.5 : 0), 0);
  return Math.round((points / checks.length) * 100);
}
