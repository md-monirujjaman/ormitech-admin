import { useMemo, useState } from 'react';
import axios from 'axios';
import { ScrollText, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdmins } from '@/features/admins/hooks';
import { useOrganizations } from '@/features/organizations/hooks';
import { apiErrorMessage } from '@/lib/apiError';
import { AUDIT_ACTION_GROUPS, type AuditLogEntry } from '@/types/audit';
import { useAuditLogs } from '../hooks';

const PAGE_SIZE = 50;
const ALL = 'all';

const RESULT_VARIANT: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  success: 'success',
  denied: 'destructive',
  error: 'warning',
};

const OPERATION_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  select: 'outline',
  insert: 'default',
  update: 'default',
  delete: 'secondary',
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });

/** The end date a person picks means "including that day", and the endpoint's `to` is exclusive. */
const exclusiveEnd = (date: string): string => {
  const end = new Date(`${date}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
};

const isForbidden = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 403;

/**
 * The administrator audit trail.
 *
 * Every admin endpoint writes here, in the same transaction as the change it records, so this is the one
 * screen that can answer "who did that, and when". The server orders it newest first and offers no other
 * ordering — a log read in any other order is a log nobody can follow — so there are no sortable columns
 * here either.
 *
 * `super_admin` only, enforced by the API. A plain administrator reaching this page gets a 403, and the page
 * says what the role requirement is instead of rendering an empty table that reads as "nothing happened".
 */
export default function AuditLogsPage() {
  const [adminId, setAdminId] = useState(ALL);
  const [organizationId, setOrganizationId] = useState(ALL);
  const [actionGroup, setActionGroup] = useState(ALL);
  const [result, setResult] = useState(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  // Both dropdowns read the lists the panel already has endpoints for, so the filter offers real ids rather
  // than asking an operator to paste a uuid.
  const adminsQuery = useAdmins({ page: 1, limit: 100 });
  const organizationsQuery = useOrganizations({ page: 1, pageSize: 100 });

  const organizationNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const organization of organizationsQuery.data?.items ?? []) names.set(organization.id, organization.name);
    return names;
  }, [organizationsQuery.data]);

  const query = {
    adminId: adminId === ALL ? undefined : adminId,
    organizationId: organizationId === ALL ? undefined : organizationId,
    action: actionGroup === ALL ? undefined : actionGroup,
    result: result === ALL ? undefined : (result as 'success' | 'denied' | 'error'),
    from: from ? new Date(`${from}T00:00:00.000Z`).toISOString() : undefined,
    to: to ? exclusiveEnd(to) : undefined,
    page,
    limit: PAGE_SIZE,
  };

  const auditQuery = useAuditLogs(query);
  const data = auditQuery.data;
  const entries = data?.items ?? [];

  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  const filtersApplied =
    adminId !== ALL || organizationId !== ALL || actionGroup !== ALL || result !== ALL || Boolean(from) || Boolean(to);

  const clearFilters = () => {
    setAdminId(ALL);
    setOrganizationId(ALL);
    setActionGroup(ALL);
    setResult(ALL);
    setFrom('');
    setTo('');
    setPage(1);
  };

  if (isForbidden(auditQuery.error)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Logs" description="Every action an administrator took." showMockNotice={false} />
        <EmptyState
          icon={ShieldAlert}
          title="This needs the super_admin role"
          description="The audit trail is what makes every other admin action accountable, so only a super admin can read it. Ask one to grant you the role, or to look something up for you."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Every read and write an administrator made, newest first. Written in the same transaction as the change."
        showMockNotice={false}
        actions={
          filtersApplied && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="audit-admin">Administrator</Label>
            <Select value={adminId} onValueChange={reset(setAdminId)}>
              <SelectTrigger id="audit-admin">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Everyone</SelectItem>
                {(adminsQuery.data?.items ?? []).map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-action">Action</Label>
            <Select value={actionGroup} onValueChange={reset(setActionGroup)}>
              <SelectTrigger id="audit-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actions</SelectItem>
                {AUDIT_ACTION_GROUPS.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-organization">Organization</Label>
            <Select value={organizationId} onValueChange={reset(setOrganizationId)}>
              <SelectTrigger id="audit-organization">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any organization</SelectItem>
                {(organizationsQuery.data?.items ?? []).map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-result">Result</Label>
            <Select value={result} onValueChange={reset(setResult)}>
              <SelectTrigger id="audit-result">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any result</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-from">From</Label>
            <Input id="audit-from" type="date" value={from} max={to || undefined} onChange={(event) => reset(setFrom)(event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-to">To</Label>
            <Input id="audit-to" type="date" value={to} min={from || undefined} onChange={(event) => reset(setTo)(event.target.value)} />
          </div>
        </div>
      </Card>

      {auditQuery.isError ? (
        <ErrorState
          title="Couldn't load the audit trail"
          description={apiErrorMessage(auditQuery.error, 'The OrmiTech API refused the request.')}
          onRetry={() => auditQuery.refetch()}
        />
      ) : auditQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={filtersApplied ? 'Nothing matches these filters' : 'Nothing recorded yet'}
          description={
            filtersApplied
              ? 'Try a wider date range, or clear the administrator and action filters.'
              : 'Entries appear here as soon as an administrator reads or changes anything.'
          }
          action={
            filtersApplied ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">When</TableHead>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} organizationNames={organizationNames} />
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={data?.meta.page ?? page}
            pageSize={data?.meta.limit ?? PAGE_SIZE}
            total={data?.meta.total ?? 0}
            onPageChange={setPage}
          />
        </Card>
      )}
    </div>
  );
}

function AuditRow({
  entry,
  organizationNames,
}: {
  entry: AuditLogEntry;
  organizationNames: Map<string, string>;
}) {
  // The organization's name when the panel has it loaded, and its id when it does not — an organization can
  // be outside the first page of the list, and showing nothing would read as "no organization".
  const organization = entry.organizationId
    ? (organizationNames.get(entry.organizationId) ?? `${entry.organizationId.slice(0, 8)}…`)
    : '—';

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">
        <time dateTime={entry.createdAt}>{formatTimestamp(entry.createdAt)}</time>
      </TableCell>
      <TableCell className="align-top">
        <p className="truncate text-sm text-foreground">{entry.adminEmail ?? '—'}</p>
        {entry.ipAddress && <p className="truncate font-mono text-[11px] text-muted-foreground">{entry.ipAddress}</p>}
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs text-foreground">{entry.action}</span>
          {entry.result && entry.result !== 'success' && (
            <Badge variant={RESULT_VARIANT[entry.result] ?? 'secondary'}>{entry.result}</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <Badge variant={OPERATION_VARIANT[entry.operation] ?? 'outline'}>{entry.operation}</Badge>
      </TableCell>
      <TableCell className="align-top font-mono text-xs text-muted-foreground">{entry.tableName}</TableCell>
      <TableCell className="align-top text-sm text-muted-foreground">{organization}</TableCell>
      <TableCell className="max-w-72 align-top">
        <p className="truncate text-xs text-muted-foreground" title={entry.detail ?? undefined}>
          {entry.detail ?? '—'}
        </p>
      </TableCell>
    </TableRow>
  );
}
