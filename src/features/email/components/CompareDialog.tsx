import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useVersion } from '../hooks';
import { diffLines, hasChanges, type DiffLine } from '../lib/diff';
import type { TemplateSource, VersionInfo } from '../types';

type Side = `v${number}` | 'editor' | 'builtin';

/** One field's lines, coloured: removed from the left side, added on the right, the rest muted. */
function DiffBlock({ title, left, right }: { title: string; left: string; right: string }) {
  const lines: DiffLine[] = useMemo(() => diffLines(left, right), [left, right]);
  const changed = hasChanges(lines);
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">{title}</h4>
        <Badge variant={changed ? 'warning' : 'secondary'}>{changed ? 'Changed' : 'Same'}</Badge>
      </div>
      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/20 p-2 text-xs leading-5" aria-label={`${title} comparison`}>
        {lines.map((line, index) => (
          <div
            key={index}
            data-kind={line.kind}
            className={cn('whitespace-pre-wrap break-words px-1', line.kind === 'removed' && 'bg-destructive/15 text-destructive', line.kind === 'added' && 'bg-success/15 text-success', line.kind === 'same' && 'text-muted-foreground')}
          >
            {line.kind === 'removed' ? '− ' : line.kind === 'added' ? '+ ' : '  '}
            {line.text}
          </div>
        ))}
      </pre>
    </section>
  );
}

/**
 * Two versions of a template side by side: any saved version, what is in the editor now, or the built-in wording. Versions are fetched
 * only when chosen. The comparison is read-only; restoring is its own, confirmed action.
 */
export function CompareDialog({
  open,
  onOpenChange,
  templateKey,
  versions,
  editor,
  builtIn,
  initialLeft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateKey: string;
  versions: VersionInfo[];
  editor: TemplateSource;
  builtIn: TemplateSource;
  initialLeft: number | null;
}) {
  const [left, setLeft] = useState<Side>(initialLeft ? `v${initialLeft}` : (versions[1] ? `v${versions[1].version}` : 'builtin'));
  const [right, setRight] = useState<Side>('editor');
  const versionOf = (side: Side): number | null => (side.startsWith('v') ? Number(side.slice(1)) : null);
  const leftQuery = useVersion(templateKey, versionOf(left));
  const rightQuery = useVersion(templateKey, versionOf(right));

  const sourceOf = (side: Side, data: TemplateSource | undefined): TemplateSource | null => (side === 'editor' ? editor : side === 'builtin' ? builtIn : (data ?? null));
  const a = sourceOf(left, leftQuery.data);
  const b = sourceOf(right, rightQuery.data);

  const options = (
    <>
      <SelectItem value="editor">What is in the editor now</SelectItem>
      <SelectItem value="builtin">Built-in wording</SelectItem>
      {versions.map((version) => (
        <SelectItem key={version.version} value={`v${version.version}`}>
          Version {version.version}
          {version.published ? ' (published)' : ''}
        </SelectItem>
      ))}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare versions</DialogTitle>
          <DialogDescription>Red lines are only on the left; green lines are only on the right.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="compare-left">Left</Label>
            <Select value={left} onValueChange={(value) => setLeft(value as Side)}>
              <SelectTrigger id="compare-left" aria-label="Left side">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{options}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compare-right">Right</Label>
            <Select value={right} onValueChange={(value) => setRight(value as Side)}>
              <SelectTrigger id="compare-right" aria-label="Right side">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{options}</SelectContent>
            </Select>
          </div>
        </div>
        {!a || !b ? (
          <p className="py-6 text-center text-sm text-muted-foreground" role="status">
            Loading…
          </p>
        ) : (
          <div className="space-y-4">
            <DiffBlock title="Subject" left={a.subject} right={b.subject} />
            <DiffBlock title="Preheader" left={a.preheader ?? ''} right={b.preheader ?? ''} />
            <DiffBlock title="HTML" left={a.html} right={b.html} />
            <DiffBlock title="Plain text" left={a.text} right={b.text} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
