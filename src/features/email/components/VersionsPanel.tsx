import { GitCompare, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/apiError';
import { useRestore, useVersions } from '../hooks';
import { formatWhen } from '../lib/format';
import type { TemplateSource } from '../types';
import { CompareDialog } from './CompareDialog';

/**
 * Every published version of a template, newest first. Versions never change: restoring publishes a copy of an old one as a new version,
 * so nothing in the history is lost, and it goes live at once, which is why it asks first.
 */
export function VersionsPanel({ templateKey, canWrite, editor, builtIn }: { templateKey: string; canWrite: boolean; editor: TemplateSource; builtIn: TemplateSource }) {
  const query = useVersions(templateKey);
  const restore = useRestore(templateKey);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [comparing, setComparing] = useState<{ left: number | null } | null>(null);
  const versions = query.data ?? [];

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h3 className="text-sm font-semibold">Version history</h3>
        <p className="text-xs text-muted-foreground">Published versions are permanent. Restoring one publishes a copy of it as a new version.</p>
      </div>

      {query.isError ? (
        <ErrorState title="Couldn't load versions" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : versions.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Nothing has been published yet, so customers receive the built-in wording.</p>
      ) : (
        <>
          <ul className="divide-y divide-border/60" aria-label="Versions">
            {versions.map((version) => (
              <li key={version.version} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Version {version.version}</span>
                    {version.published ? <Badge variant="success">Live</Badge> : null}
                    {version.restoredFromVersion ? <Badge variant="secondary">Restored from {version.restoredFromVersion}</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(version.createdAt)}
                    {version.note ? ` · ${version.note}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setComparing({ left: version.version })}>
                    <GitCompare className="size-4" aria-hidden />
                    Compare
                  </Button>
                  {canWrite && !version.published ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setRestoring(version.version)}>
                      <RotateCcw className="size-4" aria-hidden />
                      Restore
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {restore.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {apiErrorMessage(restore.error, 'The version could not be restored.')}
            </p>
          ) : null}
          {restore.isSuccess ? (
            <p className="text-sm text-success" role="status">
              Restored as version {restore.data.version}. It is live now.
            </p>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={restoring !== null}
        onOpenChange={(open) => !open && setRestoring(null)}
        title={`Restore version ${restoring ?? ''}?`}
        description="A copy of it is published as a new version and customers receive it straight away. Your draft, if you have one, is left alone."
        confirmLabel="Restore and publish"
        isPending={restore.isPending}
        onConfirm={() => {
          if (restoring !== null) restore.mutate({ version: restoring }, { onSettled: () => setRestoring(null) });
        }}
      />
      {comparing ? (
        <CompareDialog open onOpenChange={(open) => !open && setComparing(null)} templateKey={templateKey} versions={versions} editor={editor} builtIn={builtIn} initialLeft={comparing.left} />
      ) : null}
    </Card>
  );
}
