import { Mail, Pencil, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiErrorMessage } from '@/lib/apiError';
import { ROUTES } from '@/lib/constants';
import { useTemplates } from '../hooks';
import { formatWhen } from '../lib/format';
import { CATEGORY_LABEL, matchesSearch, STATUS_LABEL, templateStatuses, type TemplateStatus } from '../lib/status';
import type { EmailCategory } from '../types';

const STATUS_VARIANT = { published: 'success', draft: 'warning', disabled: 'destructive', builtin: 'secondary' } as const;

/**
 * Every email the platform sends, with where it stands: draft in progress, published version, switched off, or built-in only. A template
 * exists because the platform sends it, so there is nothing to create here: opening one and saving a draft is how its wording is made.
 */
export function TemplatesTab({ canWrite }: { canWrite: boolean }) {
  const query = useTemplates();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<EmailCategory | 'all'>('all');
  const [status, setStatus] = useState<TemplateStatus | 'all'>('all');

  const rows = useMemo(
    () =>
      (query.data ?? []).filter(
        (template) => matchesSearch(template, search) && (category === 'all' || template.category === category) && (status === 'all' || templateStatuses(template).includes(status)),
      ),
    [query.data, search, category, status],
  );

  if (query.isError) return <ErrorState title="Couldn't load email templates" description={apiErrorMessage(query.error, 'The OrmiTech API refused the request.')} onRetry={() => query.refetch()} />;
  if (query.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These are the emails the platform sends. Open one to {canWrite ? 'write your own wording (save a draft, preview it, then publish)' : 'see its wording and versions'}. Until you publish, customers receive the built-in wording.
      </p>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search templates" className="pl-9" placeholder="Search by name or key" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select value={category} onValueChange={(value) => setCategory(value as EmailCategory | 'all')}>
          <SelectTrigger className="w-44" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as TemplateStatus | 'all')}>
          <SelectTrigger className="w-44" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Mail} title="No templates match" description="Try a different search, category or status." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Last change</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((template) => (
                <TableRow key={template.key}>
                  <TableCell>
                    <Link to={`${ROUTES.emailTemplate}/${encodeURIComponent(template.key)}`} className="font-medium hover:underline">
                      {template.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {template.key}
                      {template.critical ? ' · sign-in email' : ''}
                    </p>
                  </TableCell>
                  <TableCell>{CATEGORY_LABEL[template.category]}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {templateStatuses(template).map((state) => (
                        <Badge key={state} variant={STATUS_VARIANT[state]}>
                          {STATUS_LABEL[state]}
                          {state === 'published' && template.publishedVersion ? ` v${template.publishedVersion}` : ''}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{formatWhen(template.draftUpdatedAt ?? template.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`${ROUTES.emailTemplate}/${encodeURIComponent(template.key)}`} aria-label={`${canWrite ? 'Edit' : 'Open'} ${template.name}`}>
                        <Pencil className="size-4" aria-hidden />
                        {canWrite ? 'Edit' : 'Open'}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
