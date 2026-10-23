import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocIcon } from '@/features/docs/docIcons';
import { cn } from '@/lib/utils';
import type { DocPageMeta, DocSection } from '@/types/docs';

interface Handlers {
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onAddPage: (section: DocSection) => void;
  onAddSection: (parent: DocSection | null) => void;
  onEditSection: (section: DocSection) => void;
  onDeleteSection: (section: DocSection) => void;
  onMove: (kind: 'section' | 'page', parentId: string | null, ids: string[]) => void;
  busy: boolean;
}

/** Up and down buttons that reorder a group of siblings by swapping this item with its neighbour. */
function MoveButtons({ ids, id, onMove, disabled, label }: { ids: string[]; id: string; onMove: (ids: string[]) => void; disabled: boolean; label: string }) {
  const index = ids.indexOf(id);
  const swap = (to: number) => {
    const next = [...ids];
    [next[index], next[to]] = [next[to]!, next[index]!];
    onMove(next);
  };
  return (
    <>
      <Button variant="ghost" size="icon" className="size-6" aria-label={`Move ${label} up`} disabled={disabled || index <= 0} onClick={() => swap(index - 1)}>
        <ArrowUp className="size-3" aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" className="size-6" aria-label={`Move ${label} down`} disabled={disabled || index === ids.length - 1} onClick={() => swap(index + 1)}>
        <ArrowDown className="size-3" aria-hidden />
      </Button>
    </>
  );
}

function PageRow({ page, section, handlers }: { page: DocPageMeta; section: DocSection; handlers: Handlers }) {
  const selected = handlers.selectedPageId === page.id;
  const ids = section.pages.map((entry) => entry.id);
  return (
    <li className={cn('group flex items-center gap-1 rounded-md pr-1', selected ? 'bg-primary/10' : 'hover:bg-accent')}>
      <button type="button" onClick={() => handlers.onSelectPage(page.id)} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm" aria-current={selected ? 'true' : undefined}>
        <DocIcon name={page.icon} className="size-3.5 shrink-0 text-muted-foreground" />
        <span className={cn('truncate', selected ? 'font-medium text-foreground' : 'text-muted-foreground group-hover:text-foreground')}>{page.title}</span>
        {page.status === 'draft' && (
          <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] font-normal">
            Draft
          </Badge>
        )}
      </button>
      <div className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <MoveButtons ids={ids} id={page.id} label={page.title} disabled={handlers.busy} onMove={(next) => handlers.onMove('page', section.id, next)} />
      </div>
    </li>
  );
}

function SectionNode({ section, siblings, depth, handlers }: { section: DocSection; siblings: DocSection[]; depth: number; handlers: Handlers }) {
  const [open, setOpen] = useState(true);
  const ids = siblings.map((entry) => entry.id);
  const empty = section.pages.length === 0 && section.children.length === 0;

  return (
    <li>
      <div className="group flex items-center gap-1 rounded-md pr-1 hover:bg-accent/60">
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-1.5 text-left" aria-expanded={open}>
          {open ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
          <DocIcon name={section.icon} className="size-4 shrink-0 text-foreground" />
          <span className="truncate text-sm font-medium text-foreground">{section.title}</span>
          {section.status === 'draft' && (
            <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] font-normal">
              Draft
            </Badge>
          )}
        </button>
        <div className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="size-6" aria-label={`Add a page to ${section.title}`} title="Add page" onClick={() => handlers.onAddPage(section)}>
            <FilePlus className="size-3" aria-hidden />
          </Button>
          {depth === 0 && (
            <Button variant="ghost" size="icon" className="size-6" aria-label={`Add a sub-section to ${section.title}`} title="Add sub-section" onClick={() => handlers.onAddSection(section)}>
              <FolderPlus className="size-3" aria-hidden />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-6" aria-label={`Edit ${section.title}`} title="Edit section" onClick={() => handlers.onEditSection(section)}>
            <Pencil className="size-3" aria-hidden />
          </Button>
          <MoveButtons ids={ids} id={section.id} label={section.title} disabled={handlers.busy} onMove={(next) => handlers.onMove('section', section.parentId, next)} />
          <Button variant="ghost" size="icon" className="size-6 text-destructive" aria-label={`Delete ${section.title}`} title="Delete section" onClick={() => handlers.onDeleteSection(section)}>
            <Trash2 className="size-3" aria-hidden />
          </Button>
        </div>
      </div>

      {open && (
        <ul className="ml-3 space-y-0.5 border-l border-border pl-2">
          {section.pages.map((page) => (
            <PageRow key={page.id} page={page} section={section} handlers={handlers} />
          ))}
          {section.children.map((child) => (
            <SectionNode key={child.id} section={child} siblings={section.children} depth={depth + 1} handlers={handlers} />
          ))}
          {empty && <li className="px-2 py-1 text-xs text-muted-foreground">Empty. Add a page.</li>}
        </ul>
      )}
    </li>
  );
}

/** The documentation navigation as an editable tree: sections, sub-sections and pages, with their order and status. */
export function DocTree({ tree, ...handlers }: { tree: DocSection[] } & Handlers) {
  return (
    <ul className="space-y-0.5" aria-label="Documentation sections">
      {tree.map((section) => (
        <SectionNode key={section.id} section={section} siblings={tree} depth={0} handlers={handlers} />
      ))}
    </ul>
  );
}
