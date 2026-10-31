import { Globe } from 'lucide-react';
import { env } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { effectiveDescription, effectiveTitle, type BlogDraft } from '../seo';

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** How the article may look in a Google result and when its link is shared. What is shown is cut where search engines cut it. */
export function SearchPreview({ draft, className }: { draft: BlogDraft; className?: string }) {
  const site = env.webUrl.replace(/\/+$/, '');
  const host = site.replace(/^https?:\/\//, '');
  const title = effectiveTitle(draft) || 'Article title';
  const description = effectiveDescription(draft) || 'The description shown under the title in search results appears here.';
  const image = draft.ogImageUrl || draft.coverImageUrl;
  return (
    <div className={cn('max-w-xl space-y-4', className)}>
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Google result</p>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground">
              <Globe className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 truncate">
              <span className="block truncate text-foreground">OrmiTech</span>
              <span className="block truncate text-muted-foreground">
                {host} › blog › {draft.slug || '…'}
              </span>
            </span>
          </div>
          <p className="mt-2 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{clip(title, 62)}</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{clip(description, 160)}</p>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">When the link is shared</p>
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          {image ? <img src={image} alt="" className="aspect-[1.91/1] w-full object-cover" /> : <div className="grid aspect-[1.91/1] place-items-center bg-muted text-xs text-muted-foreground">No picture: the site card is used</div>}
          <div className="border-t border-border p-3">
            <p className="text-xs uppercase text-muted-foreground">{host}</p>
            <p className="mt-0.5 text-sm font-semibold leading-snug">{clip(title, 70)}</p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{clip(description, 110)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
