import { ArrowUpRight } from 'lucide-react';
import { categoryLabel, type ProductUpdateCategory } from '../types';
import { formatReleaseDate } from '../format';

const CATEGORY_STYLE: Record<ProductUpdateCategory, { bg: string; text: string }> = {
  feature: { bg: '#fff1f3', text: '#be123c' },
  improvement: { bg: '#eff6ff', text: '#1d4ed8' },
  fix: { bg: '#fffbeb', text: '#b45309' },
  security: { bg: '#ecfdf5', text: '#047857' },
};

/**
 * The entry as a card in "What's New" on the client dashboard. It stays light in the dark admin theme on purpose:
 * the dashboard is light.
 */
export function UpdatePreview({
  title,
  description,
  imageUrl,
  category,
  version,
  releaseDate,
  learnMoreUrl,
  isNew,
}: {
  title: string;
  description: string;
  imageUrl: string | null;
  category: ProductUpdateCategory;
  version: string;
  releaseDate: string;
  learnMoreUrl: string | null;
  isNew: boolean;
}) {
  const style = CATEGORY_STYLE[category];
  return (
    <article className="overflow-hidden rounded-xl border bg-white text-slate-900 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center text-xs text-slate-400" style={{ backgroundColor: '#f8fafc' }}>
          No picture
        </div>
      )}
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full px-2 py-0.5 font-medium" style={{ backgroundColor: style.bg, color: style.text }}>
            {categoryLabel(category)}
          </span>
          {isNew && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white" style={{ backgroundColor: '#E10032' }}>NEW</span>}
          <span className="text-slate-500">{releaseDate ? formatReleaseDate(releaseDate) : 'No date'}</span>
          {version && <span className="text-slate-500">v{version}</span>}
        </div>
        <h3 className="text-base font-semibold leading-snug">{title || 'Title'}</h3>
        {description && <p className="text-sm text-slate-600">{description}</p>}
        {learnMoreUrl && (
          <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: '#E10032' }}>
            Learn more <ArrowUpRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </article>
  );
}
