import { useEffect, useState } from 'react';
import { IconField } from './IconField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiErrorMessage } from '@/lib/apiError';
import type { DocSectionNode, DocStatus } from '../types';

const NONE = '__none__';

export interface SectionFormValues {
  title: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
  status: DocStatus;
}

/** Creates a section, or edits one. A section can sit at the top or one level down, under a top-level section. */
export function SectionDialog({
  open,
  onOpenChange,
  initial,
  editing,
  topLevelSections,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: SectionFormValues;
  editing: boolean;
  /** Where a section may be placed: the top-level sections, minus the one being edited. */
  topLevelSections: DocSectionNode[];
  isPending: boolean;
  error: unknown;
  onSubmit: (values: SectionFormValues) => void;
}) {
  const [values, setValues] = useState(initial);
  useEffect(() => {
    if (open) setValues(initial);
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit section' : 'New section'}</DialogTitle>
          <DialogDescription>Sections group pages in the docs sidebar.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (values.title.trim()) onSubmit({ ...values, title: values.title.trim(), slug: values.slug.trim() });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="section-title">Title</Label>
            <Input id="section-title" value={values.title} maxLength={120} autoFocus onChange={(e) => setValues({ ...values, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="section-slug">URL name (optional)</Label>
            <Input
              id="section-slug"
              value={values.slug}
              placeholder="getting-started"
              onChange={(e) => setValues({ ...values, slug: e.target.value.toLowerCase() })}
            />
            <p className="text-xs text-muted-foreground">Lowercase letters, digits and hyphens. Made from the title when left empty; needed if the title is not in English letters.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <IconField value={values.icon} onChange={(icon) => setValues({ ...values, icon })} />
            </div>
            <div className="space-y-1.5">
              <Label>Place</Label>
              <Select value={values.parentId ?? NONE} onValueChange={(next) => setValues({ ...values, parentId: next === NONE ? null : next })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Top level</SelectItem>
                  {topLevelSections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      Under: {section.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={values.status} onValueChange={(status) => setValues({ ...values, status: status as DocStatus })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft (hidden from the public site)</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error != null && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{apiErrorMessage(error, 'The OrmiTech API refused the change.')}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !values.title.trim()}>
              {isPending ? 'Saving…' : editing ? 'Save section' : 'Create section'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Starts a page: a title and the section it goes in. The content is written in the editor afterwards. */
export function NewPageDialog({
  open,
  onOpenChange,
  sections,
  defaultSectionId,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: { id: string; label: string }[];
  defaultSectionId: string | null;
  isPending: boolean;
  error: unknown;
  onSubmit: (values: { title: string; sectionId: string; slug: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [sectionId, setSectionId] = useState<string>('');
  useEffect(() => {
    if (open) {
      setTitle('');
      setSlug('');
      setSectionId(defaultSectionId ?? sections[0]?.id ?? '');
    }
  }, [open, defaultSectionId, sections]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New page</DialogTitle>
          <DialogDescription>It starts as a draft. Write it in the editor, then publish.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim() && sectionId) onSubmit({ title: title.trim(), sectionId, slug: slug.trim() });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="page-title">Title</Label>
            <Input id="page-title" value={title} maxLength={160} autoFocus onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="page-slug">URL name (optional)</Label>
            <Input id="page-slug" value={slug} placeholder="connect-whatsapp" onChange={(e) => setSlug(e.target.value.toLowerCase())} />
          </div>
          {error != null && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{apiErrorMessage(error, 'The OrmiTech API refused the page.')}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim() || !sectionId}>
              {isPending ? 'Creating…' : 'Create page'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
