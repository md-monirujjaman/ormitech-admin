export type ProductUpdateCategory = 'feature' | 'improvement' | 'fix' | 'security';
export type ProductUpdateStatus = 'draft' | 'published';
/** auto: NEW for 3 days after publishing. always / never: forced on or off by hand. */
export type NewOverride = 'auto' | 'always' | 'never';

export interface ProductUpdate {
  id: string;
  title: string;
  description: string;
  /** Changelog notes, one change per line. */
  details: string;
  changes: string[];
  imageUrl: string | null;
  category: ProductUpdateCategory;
  version: string;
  /** YYYY-MM-DD */
  releaseDate: string;
  learnMoreUrl: string | null;
  status: ProductUpdateStatus;
  newOverride: NewOverride;
  sortOrder: number;
  publishedAt: string | null;
  /** Whether it shows NEW to people right now. */
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductUpdateInput {
  title: string;
  description: string;
  details: string;
  imageUrl: string | null;
  category: ProductUpdateCategory;
  version: string;
  releaseDate: string;
  learnMoreUrl: string | null;
  status: ProductUpdateStatus;
  newOverride: NewOverride;
  sortOrder: number;
}

export const CATEGORIES: { value: ProductUpdateCategory; label: string }[] = [
  { value: 'feature', label: 'Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'fix', label: 'Fix' },
  { value: 'security', label: 'Security' },
];

export const categoryLabel = (category: ProductUpdateCategory): string => CATEGORIES.find((item) => item.value === category)?.label ?? category;

export const NEW_OVERRIDES: { value: NewOverride; label: string; hint: string }[] = [
  { value: 'auto', label: 'Automatic', hint: 'NEW for 3 days after publishing, then it goes away by itself.' },
  { value: 'always', label: 'Always show NEW', hint: 'NEW stays on while it is published, however old it is.' },
  { value: 'never', label: 'Never show NEW', hint: 'No NEW tag at all.' },
];
