import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useUploadDocImage } from '@/features/docs/hooks';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/apiError';
import { newTagNote, todayLocal } from '../format';
import { CATEGORIES, NEW_OVERRIDES, type NewOverride, type ProductUpdate, type ProductUpdateCategory, type ProductUpdateInput } from '../types';
import { UpdatePreview } from './UpdatePreview';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const LINK = /^https?:\/\/[^\s<>"']+$/;

interface Form {
  title: string;
  description: string;
  details: string;
  imageUrl: string | null;
  category: ProductUpdateCategory;
  version: string;
  releaseDate: string;
  learnMoreUrl: string;
  published: boolean;
  newOverride: NewOverride;
  sortOrder: string;
}

const blank = (): Form => ({ title: '', description: '', details: '', imageUrl: null, category: 'feature', version: '', releaseDate: todayLocal(), learnMoreUrl: '', published: false, newOverride: 'auto', sortOrder: '0' });

const fromItem = (item: ProductUpdate): Form => ({
  title: item.title,
  description: item.description,
  details: item.details,
  imageUrl: item.imageUrl,
  category: item.category,
  version: item.version,
  releaseDate: item.releaseDate,
  learnMoreUrl: item.learnMoreUrl ?? '',
  published: item.status === 'published',
  newOverride: item.newOverride,
  sortOrder: String(item.sortOrder),
});

/** Creates or edits a product update, with a live preview of its What's New card. */
export function ProductUpdateDialog({
  open,
  onOpenChange,
  editing,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ProductUpdate | null;
  isPending: boolean;
  error: unknown;
  onSubmit: (input: ProductUpdateInput) => void;
}) {
  const [form, setForm] = useState<Form>(blank);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const upload = useUploadDocImage();
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setForm(editing ? fromItem(editing) : blank());
      setUploadError(null);
    }
  }, [open, editing]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  const sortOrder = Number(form.sortOrder);
  const link = form.learnMoreUrl.trim();

  const problem = !form.title.trim()
    ? 'Write a title.'
    : !/^\d{4}-\d{2}-\d{2}$/.test(form.releaseDate)
      ? 'Choose the release date.'
      : link && !LINK.test(link)
        ? 'The Learn more link must be a full web address starting with https://'
        : !Number.isInteger(sortOrder) || sortOrder < -1000 || sortOrder > 1000
          ? 'Order must be a whole number from -1000 to 1000.'
          : null;

  const pickImage = async (file: File) => {
    setUploadError(null);
    if (!IMAGE_TYPES.includes(file.type)) return setUploadError('Choose a JPEG, PNG, WebP or GIF picture.');
    if (file.size > MAX_IMAGE_BYTES) return setUploadError('Pictures can be up to 5 MB.');
    try {
      set('imageUrl', (await upload.mutateAsync(file)).url);
    } catch (failure) {
      setUploadError(apiErrorMessage(failure, 'The picture could not be uploaded.'));
    }
  };

  const submit = () => {
    if (problem) return;
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      details: form.details.trim(),
      imageUrl: form.imageUrl,
      category: form.category,
      version: form.version.trim(),
      releaseDate: form.releaseDate,
      learnMoreUrl: link || null,
      status: form.published ? 'published' : 'draft',
      newOverride: form.newOverride,
      sortOrder,
    });
  };

  const wasPublished = editing?.status === 'published';
  const previewIsNew = form.published && (form.newOverride === 'always' || (form.newOverride === 'auto' && (!wasPublished || (editing?.isNew ?? false))));
  const overrideHint = NEW_OVERRIDES.find((item) => item.value === form.newOverride)?.hint;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit product update' : 'New product update'}</DialogTitle>
          <DialogDescription>A card in “What’s New” and a line in the Changelog on the client dashboard.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="pu-title">Title</Label>
              <Input id="pu-title" value={form.title} maxLength={140} onChange={(event) => set('title', event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pu-description">Description (shown on the card)</Label>
              <Textarea id="pu-description" value={form.description} maxLength={800} rows={3} onChange={(event) => set('description', event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Picture</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
                  <ImagePlus className="size-4" aria-hidden />
                  {upload.isPending ? 'Uploading…' : form.imageUrl ? 'Change picture' : 'Upload picture'}
                </Button>
                {form.imageUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set('imageUrl', null)}>
                    <Trash2 className="size-4" aria-hidden />
                    Remove
                  </Button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept={IMAGE_TYPES.join(',')}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void pickImage(file);
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or GIF, up to 5 MB. A 16:9 picture fits the card best.</p>
              {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(value) => set('category', value as ProductUpdateCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pu-version">Version</Label>
                <Input id="pu-version" value={form.version} maxLength={40} placeholder="1.8.0" onChange={(event) => set('version', event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pu-date">Release date</Label>
                <Input id="pu-date" type="date" value={form.releaseDate} onChange={(event) => set('releaseDate', event.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pu-link">Learn more link (optional)</Label>
              <Input id="pu-link" value={form.learnMoreUrl} maxLength={500} placeholder="https://…" onChange={(event) => set('learnMoreUrl', event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pu-details">Changelog notes</Label>
              <Textarea id="pu-details" value={form.details} maxLength={6000} rows={5} placeholder={'One change per line\nAdded the AI Agent\nFixed the inbox filter'} onChange={(event) => set('details', event.target.value)} />
              <p className="text-xs text-muted-foreground">Shown under the date and version in the Changelog. One line per change.</p>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">NEW tag</p>
              <Select value={form.newOverride} onValueChange={(value) => set('newOverride', value as NewOverride)}>
                <SelectTrigger className="max-w-72" aria-label="NEW tag">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NEW_OVERRIDES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {overrideHint}
                {editing && ` Now: ${newTagNote(editing)}.`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.published} onCheckedChange={(value) => set('published', value)} aria-label="Published" />
              <div>
                <p className="text-sm font-medium">{form.published ? 'Published' : 'Draft'}</p>
                <p className="text-xs text-muted-foreground">{form.published ? 'Everyone on the dashboard can see it.' : 'Only visible here until you publish it.'}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pu-order">Order (optional)</Label>
              <Input id="pu-order" type="number" className="max-w-32" value={form.sortOrder} min={-1000} max={1000} onChange={(event) => set('sortOrder', event.target.value)} />
              <p className="text-xs text-muted-foreground">Newest release date shows first. Among entries of the same day, a higher number shows first.</p>
            </div>
          </div>

          <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
            <p className="text-sm font-semibold">Preview</p>
            <div className="rounded-xl bg-muted/40 p-3">
              <UpdatePreview
                title={form.title}
                description={form.description}
                imageUrl={form.imageUrl}
                category={form.category}
                version={form.version.trim()}
                releaseDate={form.releaseDate}
                learnMoreUrl={link && LINK.test(link) ? link : null}
                isNew={previewIsNew}
              />
            </div>
            <p className="text-xs text-muted-foreground">How the card looks in “What’s New”.</p>
          </div>

          <div className="space-y-3 lg:col-span-2">
            {(problem || error != null) && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error != null ? apiErrorMessage(error, 'The OrmiTech API refused the change.') : problem}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || problem !== null}>
                {isPending ? 'Saving…' : editing ? 'Save changes' : form.published ? 'Create and publish' : 'Save draft'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
