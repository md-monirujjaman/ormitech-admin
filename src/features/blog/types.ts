export type BlogState = 'draft' | 'scheduled' | 'published';
export type BlogStatus = 'draft' | 'published';

/** A TipTap (ProseMirror) document, as the API stores it. */
export interface BlogNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: BlogNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}
export interface BlogDoc {
  type: 'doc';
  content?: BlogNode[];
}

export interface BlogFaqItem {
  question: string;
  answer: string;
}

export interface BlogCta {
  text: string;
  label: string;
  href: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  status: BlogStatus;
  state: BlogState;
  readingMinutes: number;
  coverImageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface BlogPost extends BlogPostSummary {
  content: BlogDoc;
  tags: string[];
  authorName: string;
  lang: 'en' | 'bn';
  coverImageAlt: string | null;
  coverImageWidth: number | null;
  coverImageHeight: number | null;
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  keywords: string[];
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
  answer: string | null;
  keyTakeaways: string[];
  faq: BlogFaqItem[];
  cta: BlogCta | null;
  previewPath: string;
  createdAt: string;
}

export interface BlogList {
  items: BlogPostSummary[];
  categories: string[];
}

export interface BlogAsset {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

/** The fields the API accepts on create and update. */
export type BlogPostInput = Partial<
  Pick<
    BlogPost,
    | 'title'
    | 'slug'
    | 'excerpt'
    | 'content'
    | 'category'
    | 'tags'
    | 'authorName'
    | 'lang'
    | 'coverImageUrl'
    | 'coverImageAlt'
    | 'coverImageWidth'
    | 'coverImageHeight'
    | 'seoTitle'
    | 'metaDescription'
    | 'focusKeyword'
    | 'keywords'
    | 'canonicalUrl'
    | 'ogImageUrl'
    | 'noindex'
    | 'answer'
    | 'keyTakeaways'
    | 'faq'
    | 'cta'
    | 'status'
    | 'publishedAt'
  >
>;
