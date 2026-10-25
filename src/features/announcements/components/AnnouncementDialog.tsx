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
import { addDaysLocal, describeSpan, formatWhen, fromLocalInput, toLocalInput } from '../schedule';
import type { Announcement, AnnouncementButton, AnnouncementInput, AnnouncementKind, AnnouncementSurface, AnnouncementTone } from '../types';
import { BannerPreview, PopupPreview } from './Previews';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const RUN_CHOICES = [1, 3, 7, 14, 30];

interface Form {
  kind: AnnouncementKind;
  title: string;
  body: string;
  imageUrl: string | null;
  buttons: AnnouncementButton[];
  tone: AnnouncementTone;
  where: 'dashboard' | 'website' | 'both';
  enabled: boolean;
  startsAt: string;
  endsAt: string;
}

const whereOf = (targets: AnnouncementSurface[]): Form['where'] => (targets.length === 2 ? 'both' : targets[0] === 'website' ? 'website' : 'dashboard');
const targetsOf = (form: Form): AnnouncementSurface[] => (form.kind === 'banner' ? ['dashboard'] : form.where === 'both' ? ['dashboard', 'website'] : [form.where]);

function blank(kind: AnnouncementKind): Form {
  // Starts now (to the minute) and runs a week, the common case; both can be changed.
  const start = toLocalInput(new Date());
  return { kind, title: '', body: '', imageUrl: null, buttons: [], tone: 'info', where: 'dashboard', enabled: true, startsAt: start, endsAt: addDaysLocal(start, 7) };
}

function fromAnnouncement(item: Announcement): Form {
  return {
    kind: item.kind,
    title: item.title,
    body: item.body,
    imageUrl: item.imageUrl,
    buttons: item.buttons.map((button) => ({ ...button })),
    tone: item.tone,
    where: whereOf(item.targets),
    enabled: item.enabled,
    startsAt: toLocalInput(item.startsAt),
    endsAt: toLocalInput(item.endsAt),
  };
}

/** Creates or edits an announcement, with a live preview of what the audience will see. */
export function AnnouncementDialog({
  open,
  onOpenChange,
  editing,
  startKind,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Announcement | null;
  startKind: AnnouncementKind;
  isPending: boolean;
  error: unknown;
  onSubmit: (input: AnnouncementInput) => void;
}) {
  const [form, setForm] = useState<Form>(() => blank(startKind));
  const [uploadError, setUploadError] = useState<string | null>(null);
  const upload = useUploadDocImage();
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setForm(editing ? fromAnnouncement(editing) : blank(startKind));
      setUploadError(null);
    }
  }, [open, editing, startKind]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  const startIso = fromLocalInput(form.startsAt);
  const endIso = fromLocalInput(form.endsAt);
  const span = startIso && endIso ? describeSpan(startIso, endIso) : '';
  const buttons = form.buttons.filter((button) => button.label.trim() && button.href.trim());
  const incompleteButton = form.buttons.some((button) => Boolean(button.label.trim()) !== Boolean(button.href.trim()));

  const problem = !startIso
    ? 'Choose when it starts.'
    : !endIso
      ? 'Choose when it ends.'
      : new Date(endIso) <= new Date(startIso)
        ? 'It must end after it starts.'
        : form.kind === 'popup' && !form.imageUrl
          ? 'A pop-up needs a picture.'
          : form.kind === 'banner' && !form.title.trim()
            ? 'A banner needs a headline.'
            : incompleteButton
              ? 'A button needs both its words and where it goes.'
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

  const setButton = (index: number, patch: Partial<AnnouncementButton>) => set('buttons', form.buttons.map((button, at) => (at === index ? { ...button, ...patch } : button)));
  const maxButtons = form.kind === 'banner' ? 1 : 2;

  const submit = () => {
    if (problem || !startIso || !endIso) return;
    onSubmit({
      kind: form.kind,
      title: form.title.trim(),
      body: form.body.trim(),
      imageUrl: form.kind === 'popup' ? form.imageUrl : null,
      buttons: buttons.map((button) => ({ label: button.label.trim(), href: button.href.trim() })),
      tone: form.tone,
      targets: targetsOf(form),
      enabled: form.enabled,
      startsAt: startIso,
      endsAt: endIso,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit announcement' : form.kind === 'banner' ? 'New banner message' : 'New pop-up'}</DialogTitle>
          <DialogDescription>
            {form.kind === 'banner' ? 'A message under the greeting on the client dashboard, with a countdown to its end.' : 'A picture with up to two buttons that opens over the page.'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-5">
            {!editing && (
              <div className="inline-flex rounded-md border border-border p-0.5" role="radiogroup" aria-label="Type">
                {(['banner', 'popup'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={form.kind === kind}
                    onClick={() => setForm((current) => ({ ...current, kind, buttons: current.buttons.slice(0, kind === 'banner' ? 1 : 2) }))}
                    className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${form.kind === kind ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {kind === 'banner' ? 'Banner message' : 'Pop-up'}
                  </button>
                ))}
              </div>
            )}

            {form.kind === 'popup' && (
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
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or GIF, up to 5 MB. A wide or square picture works best.</p>
                {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ann-title">{form.kind === 'banner' ? 'Headline' : 'Name (for your own reference; also read out for the picture)'}</Label>
              <Input id="ann-title" value={form.title} maxLength={120} onChange={(event) => set('title', event.target.value)} />
            </div>

            {form.kind === 'banner' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ann-body">Message</Label>
                  <Textarea id="ann-body" value={form.body} maxLength={600} rows={3} onChange={(event) => set('body', event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Colour</Label>
                  <Select value={form.tone} onValueChange={(value) => set('tone', value as AnnouncementTone)}>
                    <SelectTrigger className="max-w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Blue: news or information</SelectItem>
                      <SelectItem value="success">Green: good news</SelectItem>
                      <SelectItem value="warning">Amber: something to watch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>{form.kind === 'banner' ? 'Button (optional)' : 'Buttons (up to two, optional)'}</Label>
              {form.buttons.map((button, index) => (
                <div key={index} className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-2">
                  <Input value={button.label} maxLength={30} placeholder="Button words" aria-label={`Button ${index + 1} words`} onChange={(event) => setButton(index, { label: event.target.value })} />
                  <Input value={button.href} maxLength={500} placeholder="https://… or /page" aria-label={`Button ${index + 1} goes to`} onChange={(event) => setButton(index, { href: event.target.value })} />
                  <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" aria-label="Remove button" onClick={() => set('buttons', form.buttons.filter((_, at) => at !== index))}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
              {form.buttons.length < maxButtons && (
                <Button type="button" variant="outline" size="sm" onClick={() => set('buttons', [...form.buttons, { label: '', href: '' }])}>
                  Add a button
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Where it goes: a full address (opens in a new tab), or a page on the site it is shown on, such as /inbox. Without buttons, a visitor just closes the pop-up.</p>
            </div>

            {form.kind === 'popup' && (
              <div className="space-y-1.5">
                <Label>Show on</Label>
                <Select value={form.where} onValueChange={(value) => set('where', value as Form['where'])}>
                  <SelectTrigger className="max-w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Client dashboard only</SelectItem>
                    <SelectItem value="website">Main website only</SelectItem>
                    <SelectItem value="both">Both the dashboard and the website</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">When to show it</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ann-start">Starts</Label>
                  <Input id="ann-start" type="datetime-local" value={form.startsAt} onChange={(event) => set('startsAt', event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ann-end">Ends</Label>
                  <Input id="ann-end" type="datetime-local" value={form.endsAt} onChange={(event) => set('endsAt', event.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Run for</span>
                {RUN_CHOICES.map((days) => (
                  <Button key={days} type="button" variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={!form.startsAt} onClick={() => set('endsAt', addDaysLocal(form.startsAt, days))}>
                    {days} {days === 1 ? 'day' : 'days'}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {startIso && endIso && span ? `Shown from ${formatWhen(startIso)} to ${formatWhen(endIso)} (${span}), in your time zone.` : 'Pick the start and the end.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.enabled} onCheckedChange={(value) => set('enabled', value)} aria-label="Switched on" />
              <div>
                <p className="text-sm font-medium">{form.enabled ? 'Switched on' : 'Switched off'}</p>
                <p className="text-xs text-muted-foreground">Off keeps it saved but never shows it, even inside its dates.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
            <p className="text-sm font-semibold">Preview</p>
            {form.kind === 'banner' ? (
              <div className="rounded-xl bg-muted/40 p-3">
                <BannerPreview title={form.title} body={form.body} tone={form.tone} button={buttons[0]} endsAt={endIso} />
              </div>
            ) : (
              <PopupPreview imageUrl={form.imageUrl} title={form.title} buttons={buttons} />
            )}
            <p className="text-xs text-muted-foreground">
              {form.kind === 'banner'
                ? 'Shown under “Good morning” on the client dashboard.'
                : 'Closes with the × at the corner, or when someone clicks the dimmed area around it. Shown once per visit.'}
            </p>
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
                {isPending ? 'Saving…' : editing ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
