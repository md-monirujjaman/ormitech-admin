import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/apiError';
import { thumbnailUrl, youtubeIdFrom } from '../youtube';
import type { CategoryInput, Tutorial, TutorialCategory, TutorialInput } from '../types';

export function CategoryDialog({
  open,
  onOpenChange,
  editing,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TutorialCategory | null;
  isPending: boolean;
  error: unknown;
  onSubmit: (input: CategoryInput) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? '');
      setDescription(editing?.description ?? '');
      setEnabled(editing?.enabled ?? true);
    }
  }, [open, editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>A heading on the client Tutorials page, with a short line under it. Videos are grouped under it.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim()) onSubmit({ title: title.trim(), description: description.trim(), enabled });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="cat-title">Title</Label>
            <Input id="cat-title" value={title} maxLength={80} autoFocus onChange={(event) => setTitle(event.target.value)} placeholder="Getting started" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-description">Short description</Label>
            <Textarea id="cat-description" value={description} maxLength={300} rows={2} onChange={(event) => setDescription(event.target.value)} placeholder="Set up your workspace in a few minutes." />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Show to clients" />
            Show to clients
          </label>
          {error != null && <p className="text-xs text-destructive">{apiErrorMessage(error, 'The category could not be saved.')}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? 'Saving…' : 'Save category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TutorialDialog({
  open,
  onOpenChange,
  editing,
  categories,
  startCategoryId,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Tutorial | null;
  categories: TutorialCategory[];
  startCategoryId: string | null;
  isPending: boolean;
  error: unknown;
  onSubmit: (input: TutorialInput) => void;
}) {
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    if (open) {
      setCategoryId(editing?.categoryId ?? startCategoryId ?? categories[0]?.id ?? '');
      setTitle(editing?.title ?? '');
      setDescription(editing?.description ?? '');
      setLink(editing ? `https://www.youtube.com/watch?v=${editing.youtubeId}` : '');
      setEnabled(editing?.enabled ?? true);
    }
  }, [open, editing, startCategoryId, categories]);

  const videoId = youtubeIdFrom(link);
  const problem = !categoryId ? 'Choose a category.' : !title.trim() ? 'Give the video a title.' : !videoId ? 'Paste a YouTube video link, for example https://www.youtube.com/watch?v=…' : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit video' : 'New video'}</DialogTitle>
          <DialogDescription>Paste the YouTube link. Clients watch it inside the dashboard, in a pop-up player.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!problem) onSubmit({ categoryId, title: title.trim(), description: description.trim(), youtubeUrl: link.trim(), enabled });
          }}
        >
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tut-link">YouTube link</Label>
            <Input id="tut-link" value={link} maxLength={300} onChange={(event) => setLink(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
            {link.trim() && !videoId && <p className="text-xs text-destructive">That is not a YouTube video link.</p>}
          </div>
          {videoId && <img src={thumbnailUrl(videoId)} alt="" className="aspect-video w-full max-w-xs rounded-md border border-border object-cover" />}
          <div className="space-y-1.5">
            <Label htmlFor="tut-title">Title</Label>
            <Input id="tut-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Connect your Facebook page" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tut-description">Short description</Label>
            <Textarea id="tut-description" value={description} maxLength={500} rows={3} onChange={(event) => setDescription(event.target.value)} placeholder="What the client learns in this video." />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Show to clients" />
            Show to clients
          </label>
          {error != null && <p className="text-xs text-destructive">{apiErrorMessage(error, 'The video could not be saved.')}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || problem !== null} title={problem ?? undefined}>
              {isPending ? 'Saving…' : 'Save video'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
