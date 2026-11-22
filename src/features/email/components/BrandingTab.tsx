import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/apiError';
import { useBranding, useSaveBranding, useTemplates } from '../hooks';
import { FONT_PRESETS, footerFromText, validateBranding } from '../lib/branding';
import type { Branding, BrandingInput } from '../types';
import { PreviewPane } from './PreviewPane';

const CUSTOM = '__custom__';
const toInput = (branding: Branding): BrandingInput => ({
  productName: branding.productName,
  logoUrl: branding.logoUrl,
  accentColor: branding.accentColor,
  textColor: branding.textColor,
  backgroundColor: branding.backgroundColor,
  fontFamily: branding.fontFamily,
  headerTagline: branding.headerTagline,
  footerLines: branding.footerLines,
});

/** A colour as a picker and a hex box that stay in step. */
function ColorField({ id, label, value, error, readOnly, onChange }: { id: string; label: string; value: string; error?: string; readOnly: boolean; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'} disabled={readOnly} onChange={(event) => onChange(event.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent p-1" />
        <Input id={id} value={value} readOnly={readOnly} maxLength={7} onChange={(event) => onChange(event.target.value)} className="font-mono" aria-invalid={Boolean(error)} />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * The one look every email shares: name or logo, colours, font, a line under the header and the footer. Edits stay here until Save; the
 * preview on the right is the API's rendering with the *saved* look, so it changes when you save, and a small quick look shows the rest.
 */
export function BrandingTab({ canWrite }: { canWrite: boolean }) {
  const query = useBranding();
  const templates = useTemplates();
  const save = useSaveBranding();
  const [form, setForm] = useState<BrandingInput | null>(null);
  const [footerText, setFooterText] = useState('');
  const [previewKey, setPreviewKey] = useState('auth.password_reset');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (query.data) {
      setForm(toInput(query.data));
      setFooterText(query.data.footerLines.join('\n'));
    }
  }, [query.data]);

  const input = useMemo(() => (form ? { ...form, footerLines: footerFromText(footerText) } : null), [form, footerText]);
  const errors = useMemo(() => (input ? validateBranding(input) : {}), [input]);
  const preset = form ? (FONT_PRESETS.find((font) => font.value === form.fontFamily)?.value ?? CUSTOM) : CUSTOM;
  const previewRequest = useMemo(() => ({ use: 'builtin' as const }), []);

  if (query.isError) return <ErrorState title="Couldn't load the branding" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />;
  if (!query.data || !form || !input) return <Skeleton className="h-96 w-full" />;

  const set = (patch: Partial<BrandingInput>) => {
    setSaved(false);
    setForm({ ...form, ...patch });
  };
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Shared look</h3>
          <Badge variant={query.data.custom ? 'success' : 'secondary'}>{query.data.custom ? 'Custom' : 'Built-in'}</Badge>
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!hasErrors) save.mutate(input, { onSuccess: () => setSaved(true) });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand-name">Product name</Label>
              <Input id="brand-name" value={form.productName} readOnly={!canWrite} maxLength={60} onChange={(event) => set({ productName: event.target.value })} aria-invalid={Boolean(errors.productName)} />
              {errors.productName ? <p className="text-xs text-destructive">{errors.productName}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand-logo">Logo address (optional)</Label>
              <Input id="brand-logo" value={form.logoUrl ?? ''} readOnly={!canWrite} placeholder="https://…/logo.png" onChange={(event) => set({ logoUrl: event.target.value.trim() || null })} aria-invalid={Boolean(errors.logoUrl)} />
              {errors.logoUrl ? <p className="text-xs text-destructive">{errors.logoUrl}</p> : <p className="text-xs text-muted-foreground">Without one, the product name is shown.</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ColorField id="brand-accent" label="Primary colour (buttons, links)" value={form.accentColor} error={errors.accentColor} readOnly={!canWrite} onChange={(value) => set({ accentColor: value })} />
            <ColorField id="brand-text" label="Text colour" value={form.textColor} error={errors.textColor} readOnly={!canWrite} onChange={(value) => set({ textColor: value })} />
            <ColorField id="brand-background" label="Secondary colour (page background)" value={form.backgroundColor} error={errors.backgroundColor} readOnly={!canWrite} onChange={(value) => set({ backgroundColor: value })} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-font">Font</Label>
            <Select value={preset} onValueChange={(value) => value !== CUSTOM && set({ fontFamily: value })} disabled={!canWrite}>
              <SelectTrigger id="brand-font" aria-label="Font">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_PRESETS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM}>Custom…</SelectItem>
              </SelectContent>
            </Select>
            {preset === CUSTOM ? (
              <>
                <Input aria-label="Custom font stack" value={form.fontFamily} readOnly={!canWrite} onChange={(event) => set({ fontFamily: event.target.value })} aria-invalid={Boolean(errors.fontFamily)} />
                {errors.fontFamily ? <p className="text-xs text-destructive">{errors.fontFamily}</p> : null}
              </>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brand-tagline">Header line (under the logo)</Label>
            <Input id="brand-tagline" value={form.headerTagline} readOnly={!canWrite} maxLength={300} onChange={(event) => set({ headerTagline: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-footer">Footer (one line per row, up to 6)</Label>
            <Textarea
              id="brand-footer"
              rows={3}
              value={footerText}
              readOnly={!canWrite}
              onChange={(event) => {
                setSaved(false);
                setFooterText(event.target.value);
              }}
              aria-invalid={Boolean(errors.footerLines)}
            />
            {errors.footerLines ? <p className="text-xs text-destructive">{errors.footerLines}</p> : null}
          </div>

          {/* A quick look at the unsaved choices; the real rendering is the preview beside this card, once saved. */}
          <div className="rounded-lg border border-border p-3" style={{ background: form.backgroundColor, fontFamily: form.fontFamily, color: form.textColor }} aria-label="Quick look at unsaved changes">
            <div className="rounded-md bg-white p-3 text-sm shadow-sm" style={{ color: form.textColor }}>
              <p className="text-lg font-bold" style={{ color: form.accentColor }}>
                {form.productName || 'Product name'}
              </p>
              {form.headerTagline ? <p className="text-xs text-gray-500">{form.headerTagline}</p> : null}
              <p className="my-2">Your email reads like this.</p>
              <span className="inline-block rounded-md px-3 py-1.5 text-sm font-semibold text-white" style={{ background: form.accentColor }}>
                A button
              </span>
              <p className="mt-3 border-t pt-2 text-xs text-gray-500">{input.footerLines.join(' · ') || 'Footer'}</p>
            </div>
          </div>

          <div role="status" aria-live="polite" className="min-h-5 text-sm">
            {save.isError ? <p className="text-destructive">{apiErrorMessage(save.error, 'The branding could not be saved.')}</p> : null}
            {saved ? <p className="text-success">Saved. Every email now uses this look.</p> : null}
          </div>
          {canWrite ? (
            <Button type="submit" disabled={save.isPending || hasErrors}>
              {save.isPending ? 'Saving…' : 'Save branding'}
            </Button>
          ) : null}
        </form>
      </Card>

      <Card className="space-y-3 self-start p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Preview with the saved look</h3>
          <Select value={previewKey} onValueChange={setPreviewKey}>
            <SelectTrigger className="w-60" aria-label="Preview template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(templates.data ?? []).map((template) => (
                <SelectItem key={template.key} value={template.key}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <PreviewPane templateKey={previewKey} request={previewRequest} />
      </Card>
    </div>
  );
}
