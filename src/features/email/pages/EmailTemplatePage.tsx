import { ArrowLeft, FileText, Rocket, Save, Send, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import { ROUTES } from '@/lib/constants';
import { PreviewPane } from '../components/PreviewPane';
import { TestEmailDialog } from '../components/TestEmailDialog';
import { VariablePicker } from '../components/VariablePicker';
import { VersionsPanel } from '../components/VersionsPanel';
import { useDiscardDraft, usePublish, useSaveDraft, useSetEnabled, useTemplate } from '../hooks';
import { CATEGORY_LABEL, STATUS_LABEL, templateStatuses } from '../lib/status';
import { insertPlaceholder } from '../lib/variables';
import type { PreviewRequest, TemplateSource } from '../types';

type Field = 'subject' | 'preheader' | 'html' | 'text';
const LIMITS: Record<Field, number> = { subject: 200, preheader: 200, html: 100_000, text: 50_000 };

const normalize = (source: TemplateSource): Required<TemplateSource> => ({ subject: source.subject, preheader: source.preheader ?? '', html: source.html, text: source.text });
/** What goes to the API: an empty preheader is no preheader. */
const toSource = (form: Required<TemplateSource>): TemplateSource => ({ subject: form.subject, ...(form.preheader.trim() ? { preheader: form.preheader } : {}), html: form.html, text: form.text });

/**
 * One template: edit the subject, preheader, HTML and plain text with the variables it may use, see the real rendered email beside it,
 * save a draft, publish, switch it off, send a test, and browse its versions. The API validates and renders everything; this screen
 * only carries what is typed there and what comes back.
 */
export default function EmailTemplatePage() {
  const { key = '' } = useParams();
  const { can } = usePermissions();
  const canWrite = can('email.write');
  const query = useTemplate(key);
  const detail = query.data;
  const saveDraft = useSaveDraft(key);
  const discard = useDiscardDraft(key);
  const publish = usePublish(key);
  const setEnabled = useSetEnabled(key);

  const baseline = useMemo(() => (detail ? normalize(detail.draft ?? detail.published ?? detail.builtIn) : null), [detail]);
  const baselineSignature = baseline ? JSON.stringify(baseline) : '';
  const [form, setForm] = useState<Required<TemplateSource> | null>(null);
  // What is saved changed (a save, a discard, a restore): the editor starts again from it. A refetch that brings the same text changes nothing.
  useEffect(() => {
    if (baseline) setForm(baseline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baselineSignature]);

  const [samples, setSamples] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [note, setNote] = useState('');
  const [testing, setTesting] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const refs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const [focused, setFocused] = useState<Field>('html');
  const insert = (name: string) => {
    if (!form || !canWrite) return;
    const element = refs.current[focused];
    const selection = element ? { start: element.selectionStart ?? form[focused].length, end: element.selectionEnd ?? form[focused].length } : null;
    const { value, cursor } = insertPlaceholder(form[focused], name, selection);
    setForm({ ...form, [focused]: value });
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(cursor, cursor);
    });
  };

  const dirty = form !== null && JSON.stringify(form) !== baselineSignature;
  const request: PreviewRequest | null = useMemo(() => {
    if (!form || !detail) return null;
    const changed = Object.fromEntries(Object.entries(samples).filter(([name, value]) => value.trim() !== '' && value !== detail.variables.find((variable) => variable.name === name)?.sample));
    return { draft: toSource(form), ...(Object.keys(changed).length ? { variables: changed } : {}) };
  }, [form, samples, detail]);

  if (query.isError) {
    return <ErrorState title="Couldn't load this template" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />;
  }
  if (!detail || !form || !request) return <Skeleton className="h-96 w-full" />;

  const statuses = templateStatuses(detail);
  const basedOn = detail.draft ? 'your saved draft' : detail.published ? `published version ${detail.published.version}` : 'the built-in wording';
  const busy = saveDraft.isPending || publish.isPending || discard.isPending || setEnabled.isPending;
  const error = saveDraft.error ?? publish.error ?? discard.error ?? setEnabled.error;

  const doSave = async () => {
    setMessage(null);
    const result = await saveDraft.mutateAsync(toSource(form));
    setMessage({ tone: result.warnings.length ? 'warn' : 'ok', text: result.warnings.length ? `Draft saved. The sanitizer will remove: ${result.warnings.join(', ')}.` : 'Draft saved. Customers still receive the published version.' });
  };
  const doPublish = async () => {
    setMessage(null);
    try {
      // Publish what is on screen: it is saved as the draft first, so the version is exactly what the administrator was looking at.
      await saveDraft.mutateAsync(toSource(form));
      const result = await publish.mutateAsync(note.trim() || undefined);
      setMessage({ tone: 'ok', text: `Published as version ${result.version}. Customers receive it now.` });
      setNote('');
    } catch {
      // The error is shown from the mutation below.
    } finally {
      setPublishing(false);
    }
  };

  const field = (name: Field, label: string, multiline: boolean, rows = 0) => {
    const shared = {
      id: `email-${name}`,
      value: form[name],
      maxLength: LIMITS[name],
      readOnly: !canWrite,
      onFocus: () => setFocused(name),
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [name]: event.target.value }),
    };
    return (
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor={shared.id}>{label}</Label>
          <span className="text-xs text-muted-foreground">
            {form[name].length.toLocaleString()} / {LIMITS[name].toLocaleString()}
          </span>
        </div>
        {multiline ? (
          <Textarea {...shared} rows={rows} spellCheck={false} className="font-mono text-xs" ref={(element) => void (refs.current[name] = element)} />
        ) : (
          <Input {...shared} ref={(element) => void (refs.current[name] = element)} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to={ROUTES.email} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          All email templates
        </Link>
      </div>
      <PageHeader
        title={detail.name}
        description={`${detail.key} · ${CATEGORY_LABEL[detail.category]}${detail.critical ? ' · sign-in email' : ''}`}
        showMockNotice={false}
      />
      {canWrite && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setTesting(true)}>
            <Send className="size-4" aria-hidden />
            Send test email
          </Button>
          <Button type="button" variant="outline" disabled={!dirty || busy} onClick={() => void doSave().catch(() => undefined)}>
            <Save className="size-4" aria-hidden />
            {saveDraft.isPending ? 'Saving…' : 'Save draft'}
          </Button>
          <Button type="button" disabled={busy || (!dirty && !detail.hasDraft)} onClick={() => setPublishing(true)}>
            <Rocket className="size-4" aria-hidden />
            Publish
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2" aria-label="Status">
        {statuses.map((status) => (
          <Badge key={status} variant={status === 'published' ? 'success' : status === 'draft' ? 'warning' : status === 'disabled' ? 'destructive' : 'secondary'}>
            {STATUS_LABEL[status]}
            {status === 'published' && detail.publishedVersion ? ` v${detail.publishedVersion}` : ''}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground">Editing {basedOn}{dirty ? ' · unsaved changes' : ''}</span>
      </div>

      <div role="status" aria-live="polite" className="min-h-5 text-sm">
        {message ? <p className={message.tone === 'ok' ? 'text-success' : 'text-warning'}>{message.text}</p> : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {apiErrorMessage(error, 'The change could not be saved.')}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            {field('subject', 'Subject', false)}
            {field('preheader', 'Preheader (the grey preview text in an inbox)', false)}
            {field('html', 'Full email HTML (header, body, footer and CSS)', true, 24)}
            {field('text', 'Plain-text body', true, 8)}
            <VariablePicker variables={detail.variables} onInsert={insert} disabled={!canWrite} />
            <p className="text-xs text-muted-foreground">
              This is the whole email. Paste a complete HTML document with your own header, footer, tables, inline styles and a &lt;style&gt; block. Nothing is added around it. The server removes only what can run code or reach out of the message: scripts, frames, forms, event handlers, &lt;link&gt;, CSS @import and non-https images. The preview shows what is sent.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="ghost" disabled={!canWrite} onClick={() => setForm(normalize(detail.builtIn))}>
                <FileText className="size-4" aria-hidden />
                Load the built-in wording
              </Button>
              {canWrite && detail.hasDraft ? (
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmDiscard(true)}>
                  <Trash2 className="size-4" aria-hidden />
                  Discard draft
                </Button>
              ) : null}
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Use my wording</h3>
                <p className="text-xs text-muted-foreground">
                  When off, the built-in wording is sent instead. The email is never skipped{detail.critical ? ', and a sign-in email always falls back to the built-in wording if anything fails' : ''}.
                </p>
              </div>
              <Switch
                aria-label="Use my wording"
                checked={detail.enabled}
                disabled={!canWrite || busy}
                onCheckedChange={(next) => (next ? setEnabled.mutate(true) : setConfirmDisable(true))}
              />
            </div>
          </Card>

          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">Sample data for the preview</h3>
            <p className="text-xs text-muted-foreground">Made-up values. Change one (for example the code) to see it in the email. Nothing is sent or issued.</p>
            {detail.variables.length === 0 ? (
              <p className="text-xs text-muted-foreground">This template has no variables.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.variables.map((variable) => (
                  <div key={variable.name} className="space-y-1">
                    <Label htmlFor={`sample-${variable.name}`} className="text-xs">
                      {variable.name}
                    </Label>
                    <Input id={`sample-${variable.name}`} value={samples[variable.name] ?? variable.sample} onChange={(event) => setSamples({ ...samples, [variable.name]: event.target.value })} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="space-y-3 self-start p-4 xl:sticky xl:top-4">
          <h3 className="text-sm font-semibold">Preview</h3>
          <PreviewPane templateKey={detail.key} request={request} />
        </Card>
      </div>

      <VersionsPanel templateKey={detail.key} canWrite={canWrite} editor={toSource(form)} builtIn={detail.builtIn} />

      <ConfirmDialog
        open={publishing}
        onOpenChange={(open) => !open && setPublishing(false)}
        title="Publish this wording?"
        description={`Customers receive it straight away.${detail.critical ? ' This is a sign-in email: if it ever fails to render, the built-in wording is sent instead.' : ''} It becomes a permanent version you can restore later.`}
        confirmLabel="Publish"
        isPending={saveDraft.isPending || publish.isPending}
        onConfirm={() => void doPublish()}
      >
        <div className="space-y-1.5">
          <Label htmlFor="publish-note">Note (optional)</Label>
          <Input id="publish-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="What changed and why" />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmDisable}
        onOpenChange={setConfirmDisable}
        title="Switch to the built-in wording?"
        description="Customers receive the built-in wording until you switch this back on. Your versions are kept."
        confirmLabel="Use built-in wording"
        isPending={setEnabled.isPending}
        onConfirm={() => setEnabled.mutate(false, { onSettled: () => setConfirmDisable(false) })}
      />
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard the draft?"
        description="The saved draft is deleted. The published version is not affected."
        confirmLabel="Discard draft"
        destructive
        isPending={discard.isPending}
        onConfirm={() => discard.mutate(undefined, { onSettled: () => setConfirmDiscard(false) })}
      />
      <TestEmailDialog open={testing} onOpenChange={setTesting} templateKey={detail.key} hasDraft={detail.hasDraft} />
    </div>
  );
}
