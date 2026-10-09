import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrganizations } from '@/features/organizations/hooks';
import { apiErrorMessage } from '@/lib/apiError';
import { ROUTES } from '@/lib/constants';
import { LEAD_STATUSES } from '@/types/crm';
import { useLeads } from '../hooks';

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  new: 'default',
  contacted: 'warning',
  qualified: 'secondary',
  converted: 'success',
  lost: 'destructive',
};

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });

/**
 * Every lead on the platform, across every organization.
 *
 * Read-only, which is the API's position too: a lead's status is the sales story its own organization is
 * telling, and there is no endpoint that lets the panel edit one. What this screen is for is answering
 * "where did this lead come from and who has it", which is a support question.
 */
export default function LeadsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [organizationId, setOrganizationId] = useState('all');
  const [page, setPage] = useState(1);

  // The organization filter's options: the same list the Organizations screen reads.
  const organizationsQuery = useOrganizations({ page: 1, pageSize: 100 });

  const leadsQuery = useLeads({
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    organizationId: organizationId === 'all' ? undefined : organizationId,
    page,
    limit: PAGE_SIZE,
  });

  const data = leadsQuery.data;
  const leads = data?.items ?? [];

  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Leads captured from conversations, across every organization."
        showMockNotice={false}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-8"
            placeholder="Search by name, email or phone"
            value={search}
            onChange={(event) => reset(setSearch)(event.target.value)}
            aria-label="Search leads"
          />
        </div>

        <Select value={status} onValueChange={reset(setStatus)}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={organizationId} onValueChange={reset(setOrganizationId)}>
          <SelectTrigger className="w-56" aria-label="Filter by organization">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All organizations</SelectItem>
            {(organizationsQuery.data?.items ?? []).map((organization) => (
              <SelectItem key={organization.id} value={organization.id}>
                {organization.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {leadsQuery.isError ? (
        <ErrorState
          title="Couldn't load leads"
          description={apiErrorMessage(leadsQuery.error, 'The OrmiTech API refused the request.')}
          onRetry={() => leadsQuery.refetch()}
        />
      ) : leadsQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No leads match"
          description="Try a different search term, or clear the status and organization filters."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Captured</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`${ROUTES.leads}/${lead.organizationId}/${lead.id}`)}
                >
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{lead.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{lead.email ?? lead.phone ?? '—'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.organizationName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[lead.status] ?? 'secondary'}>{lead.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.source}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.assignedAgentName ?? 'Unassigned'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
