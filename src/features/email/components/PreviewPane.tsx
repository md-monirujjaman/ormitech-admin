import { Monitor, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { usePreview } from '../hooks';
import type { PreviewRequest } from '../types';

/** The pause after the last keystroke before the preview is asked for again. */
const DEBOUNCE_MS = 500;

/** `value`, but only once it has stopped changing for `delay` ms. */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * The email exactly as the API renders it: subject, HTML in a frame of the width the API suggests for the chosen screen, and plain text.
 * Nothing is rendered here. The HTML goes into a frame with every sandbox restriction on (no scripts, no forms, no navigation), because
 * it is what an administrator typed.
 */
export function PreviewPane({ templateKey, request, className }: { templateKey: string; request: PreviewRequest; className?: string }) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const settled = useDebounced(request, DEBOUNCE_MS);
  const query = usePreview(templateKey, { ...settled, viewport });
  const preview = query.data;
  const stale = request !== settled || query.isFetching;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5" role="group" aria-label="Preview size">
          <Button type="button" size="sm" variant={viewport === 'desktop' ? 'secondary' : 'ghost'} aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')}>
            <Monitor className="size-4" aria-hidden />
            Desktop
          </Button>
          <Button type="button" size="sm" variant={viewport === 'mobile' ? 'secondary' : 'ghost'} aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')}>
            <Smartphone className="size-4" aria-hidden />
            Mobile
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
          {stale ? 'Updating preview…' : 'Rendered by the API with sample data'}
          {preview?.warnings.length ? <Badge variant="warning">Removed: {preview.warnings.join(', ')}</Badge> : null}
        </div>
      </div>

      {query.isError ? (
        <ErrorState title="This can't be previewed yet" description={apiErrorMessage(query.error, 'The preview could not be rendered.')} onRetry={() => query.refetch()} />
      ) : !preview ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Subject</p>
            <p className="text-sm font-medium break-words" data-testid="preview-subject">
              {preview.subject}
            </p>
          </div>
          <Tabs defaultValue="html">
            <TabsList>
              <TabsTrigger value="html">Email</TabsTrigger>
              <TabsTrigger value="text">Plain text</TabsTrigger>
            </TabsList>
            <TabsContent value="html">
              <div className="overflow-auto rounded-lg border border-border bg-muted/40 p-3">
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={preview.html}
                  data-testid="preview-frame"
                  style={{ width: preview.frameWidth, maxWidth: '100%', height: 640 }}
                  className="mx-auto block rounded-md border border-border bg-white"
                />
              </div>
            </TabsContent>
            <TabsContent value="text">
              <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-xs" data-testid="preview-text">
                {preview.text}
              </pre>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
