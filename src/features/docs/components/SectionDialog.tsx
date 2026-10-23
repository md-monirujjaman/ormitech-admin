import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconPicker } from '@/features/docs/components/IconPicker';
import { slugFromTitle } from '@/features/docs/slug';
import type { DocSection, DocStatus, SectionInput } from '@/types/docs';

const NO_PARENT = '__top__';

/** Add or edit a section (or sub-section). Top-level sections can be parents; sub-sections go one level deep. */
export function SectionDialog({
  open,
  onOpenChange,
  section,
  defaultParentId,
  topLevel,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section?: DocSection;
  defaultParentId?: string | null;
  /** The top-level sections, for the parent picker. */
  topLevel: DocSection[];
  isPending: boolean;
  error?: string | null;
  onSubmit: (input: SectionInput & { title: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string>(NO_PARENT);
  const [status, setStatus] = useState<DocStatus>('draft');

  useEffect(() => {
    if (!open) return;
    setTitle(section?.title ?? '');
    setSlug(section?.slug ?? '');
    setSlugTouched(Boolean(section));
    setIcon(section?.icon ?? null);
    setParentId(section?.parentId ?? defaultParentId ?? NO_PARENT);
    setStatus(section?.status ?? 'draft');
  }, [open, section, defaultParentId]);

  // A section that has sub-sections can only be top level, and one cannot be its own parent.
  const hasChildren = (section?.children.length ?? 0) > 0;
  const parents = topLevel.filter((candidate) => candidate.id !== section?.id);
  const effectiveSlug = slug || slugFromTitle(title);
  const canSave = title.trim().length > 0 && effectiveSlug.length > 0 && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{section ? 'Edit section' : parentId !== NO_PARENT ? 'Add sub-section' : 'Add section'}</DialogTitle>
          <DialogDescription>Sections make up the left navigation of the docs site. Drafts are not shown there.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="section-title">Title</Label>
            <Input
              id="section-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slugTouched) setSlug(slugFromTitle(event.target.value));
              }}
              maxLength={120}
              placeholder="Getting started"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="section-slug">URL name</Label>
            <Input
              id="section-slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value.toLowerCase());
              }}
              maxLength={80}
              placeholder="getting-started"
            />
            <p className="text-xs text-muted-foreground">Lowercase letters, digits and hyphens. Needed by hand when the title has no English letters.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Inside</Label>
              <Select value={parentId} onValueChange={setParentId} disabled={hasChildren}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Top level</SelectItem>
                  {parents.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasChildren && <p className="text-xs text-muted-foreground">It has sub-sections, so it stays top level.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as DocStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (hidden)</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            disabled={!canSave}
            onClick={() =>
              onSubmit({ title: title.trim(), slug: effectiveSlug, icon, parentId: parentId === NO_PARENT ? null : parentId, status })
            }
          >
            {isPending ? 'Saving…' : section ? 'Save changes' : 'Add section'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
