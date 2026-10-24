export type DocStatus = 'draft' | 'published';

export interface DocPageMeta {
  id: string;
  slug: string;
  path: string;
  title: string;
  description: string | null;
  icon: string | null;
  position: number;
  status: DocStatus;
  updatedAt: string;
}

export interface DocSectionNode {
  id: string;
  slug: string;
  path: string;
  title: string;
  icon: string | null;
  position: number;
  status: DocStatus;
  parentId: string | null;
  pages: DocPageMeta[];
  children: DocSectionNode[];
}

export interface DocPage {
  id: string;
  sectionId: string;
  slug: string;
  path: string;
  title: string;
  description: string | null;
  icon: string | null;
  content: string;
  position: number;
  status: DocStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocAsset {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface CreateSectionInput {
  title: string;
  slug?: string;
  icon?: string;
  parentId?: string;
  status?: DocStatus;
}

export interface UpdateSectionInput {
  title?: string;
  slug?: string;
  icon?: string | null;
  parentId?: string | null;
  status?: DocStatus;
}

export interface CreatePageInput {
  sectionId: string;
  title: string;
  slug?: string;
  description?: string | null;
  icon?: string;
  content?: string;
  status?: DocStatus;
}

export interface UpdatePageInput {
  sectionId?: string;
  title?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  content?: string;
  status?: DocStatus;
}

export interface ReorderInput {
  kind: 'section' | 'page';
  parentId?: string | null;
  ids: string[];
}
