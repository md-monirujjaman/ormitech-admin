import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, FilePlus, FileText, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DocPageMeta, DocSectionNode } from '../types';

export interface TreeActions {
  selectedPageId: string | null;
  canWrite: boolean;
  onSelectPage: (id: string) => void;
  onAddPage: (sectionId: string) => void;
  onAddSubsection: (parent: DocSectionNode) => void;
  onEditSection: (section: DocSectionNode) => void;
  onDeleteSection: (section: DocSectionNode) => void;
  onMoveSection: (section: DocSectionNode, siblings: DocSectionNode[], direction: -1 | 1) => void;
  onMovePage: (page: DocPageMeta, section: DocSectionNode, direction: -1 | 1) => void;
}

function StatusDot({ status }: { status: string }) {
  return status === 'published' ? null : (
    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
      Draft
    </Badge>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon" className="size-6" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

function Section({ section, siblings, depth, actions }: { section: DocSectionNode; siblings: DocSectionNode[]; depth: number; actions: TreeActions }) {
  const [open, setOpen] = useState(true);
  const index = siblings.findIndex((candidate) => candidate.id === section.id);

  return (
    <li className={cn(depth === 0 && 'rounded-lg border border-border/60 p-2')}>
      <div className={cn('group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-muted/60', depth > 0 && 'ml-4')}>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="size-4 shrink-0" aria-hidden /> : <ChevronRight className="size-4 shrink-0" aria-hidden />}
          <span className="truncate text-sm font-medium">{section.title}</span>
          <StatusDot status={section.status} />
        </button>
        {actions.canWrite && (
          <div className="flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <IconButton label="Add page" onClick={() => actions.onAddPage(section.id)}>
              <FilePlus className="size-3.5" aria-hidden />
            </IconButton>
            {depth === 0 && (
              <IconButton label="Add sub-section" onClick={() => actions.onAddSubsection(section)}>
                <FolderPlus className="size-3.5" aria-hidden />
              </IconButton>
            )}
            <IconButton label="Move up" disabled={index <= 0} onClick={() => actions.onMoveSection(section, siblings, -1)}>
              <ArrowUp className="size-3.5" aria-hidden />
            </IconButton>
            <IconButton label="Move down" disabled={index === siblings.length - 1} onClick={() => actions.onMoveSection(section, siblings, 1)}>
              <ArrowDown className="size-3.5" aria-hidden />
            </IconButton>
            <IconButton label="Edit section" onClick={() => actions.onEditSection(section)}>
              <Pencil className="size-3.5" aria-hidden />
            </IconButton>
            <IconButton label="Delete section" onClick={() => actions.onDeleteSection(section)}>
              <Trash2 className="size-3.5 text-destructive" aria-hidden />
            </IconButton>
          </div>
        )}
      </div>

      {open && (
        <ul className={cn('space-y-0.5', depth > 0 ? 'ml-8' : 'ml-5')}>
          {section.pages.map((page, pageIndex) => (
            <li key={page.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => actions.onSelectPage(page.id)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-muted/60',
                  actions.selectedPageId === page.id && 'bg-primary/10 font-medium text-primary',
                )}
              >
                <FileText className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{page.title}</span>
                <StatusDot status={page.status} />
              </button>
              {actions.canWrite && (
                <div className="flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <IconButton label="Move page up" disabled={pageIndex === 0} onClick={() => actions.onMovePage(page, section, -1)}>
                    <ArrowUp className="size-3.5" aria-hidden />
                  </IconButton>
                  <IconButton label="Move page down" disabled={pageIndex === section.pages.length - 1} onClick={() => actions.onMovePage(page, section, 1)}>
                    <ArrowDown className="size-3.5" aria-hidden />
                  </IconButton>
                </div>
              )}
            </li>
          ))}
          {section.children.map((child) => (
            <Section key={child.id} section={child} siblings={section.children} depth={depth + 1} actions={actions} />
          ))}
          {section.pages.length === 0 && section.children.length === 0 && <li className="px-2 py-1 text-xs text-muted-foreground">No pages yet.</li>}
        </ul>
      )}
    </li>
  );
}

export function DocsTree({ sections, actions }: { sections: DocSectionNode[]; actions: TreeActions }) {
  return (
    <ul className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {sections.map((section) => (
        <Section key={section.id} section={section} siblings={sections} depth={0} actions={actions} />
      ))}
    </ul>
  );
}
