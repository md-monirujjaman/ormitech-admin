import { useEffect, useMemo, useState } from 'react';
import { MessagesSquare, Search } from 'lucide-react';
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
import { CHANNEL_TYPES, CONVERSATION_STATUSES } from '@/types/crm';
import { useConversations } from '../hooks';

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
  open: 'default',
  pending: 'warning',
  resolved: 'success',
  archived: 'secondary',
};

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—';

/**
 * Conversations, one organization at a time.
 *
 * The organization comes first because the API's conversation endpoints are organization-scoped, and that is
 * not an oversight to work around: a platform-wide thread list would mix one customer's messages with
 * another's in a single table, which is exactly the view nobody should be reading casually. Choosing a
 * customer first makes looking at their conversations a deliberate act — and it is recorded as one, in the
 * audit trail.
 */
export default function ConversationsPage() {
  const navigate = useNavigate();
  const [organizationId, setOrganizationId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [page, setPage] = useState(1);

  const organizationsQuery = useOrganizations({ page: 1, pageSize: 100 });
  // Memoised so the effect below depends on one stable array rather than a new one every render.
  const organizations = useMemo(() => organizationsQuery.data?.items ?? [], [organizationsQuery.data]);

  // Opens on the first organization rather than on an empty screen that looks broken.
  useEffect(() => {
    const first = organizations[0];
    if (!organizationId && first) setOrganizationId(first.id);
  }, [organizationId, organizations]);

  const conversationsQuery = useConversations(organizationId || undefined, {
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    channel: channel === 'all' ? undefined : channel,
    page,
    limit: PAGE_SIZE,
  });

  const data = conversationsQuery.data;
  const conversations = data?.items ?? [];

  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversations"
        description="Read any organization’s conversations. Read-only — the panel cannot reply."
        showMockNotice={false}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={organizationId} onValueChange={reset(setOrganizationId)}>
          <SelectTrigger className="w-64" aria-label="Choose an organization">
            <SelectValue placeholder="Choose an organization" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((organization) => (
              <SelectItem key={organization.id} value={organization.id}>
                {organization.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-8"
            placeholder="Search by customer name, email or phone"
            value={search}
            onChange={(event) => reset(setSearch)(event.target.value)}
            aria-label="Search conversations"
          />
        </div>

        <Select value={status} onValueChange={reset(setStatus)}>
          <SelectTrigger className="w-36" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CONVERSATION_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={channel} onValueChange={reset(setChannel)}>
          <SelectTrigger className="w-36" aria-label="Filter by channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {CHANNEL_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {organizationsQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : organizations.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No organizations yet" description="There is nothing to read." />
      ) : conversationsQuery.isError ? (
        <ErrorState
          title="Couldn't load conversations"
          description={apiErrorMessage(conversationsQuery.error, 'The OrmiTech API refused the request.')}
          onRetry={() => conversationsQuery.refetch()}
        />
      ) : conversationsQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No conversations match"
          description="Try a different search term, or clear the status and channel filters."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Last message</TableHead>
                <TableHead>Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((conversation) => (
                <TableRow
                  key={conversation.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`${ROUTES.conversations}/${organizationId}/${conversation.id}`)}
                >
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{conversation.customerName ?? 'Unnamed customer'}</p>
                      <p className="truncate text-xs text-muted-foreground">{conversation.customerEmail ?? '—'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {conversation.channelName ?? conversation.channel}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[conversation.status] ?? 'secondary'}>{conversation.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{conversation.mode}</Badge>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <p className="truncate text-sm text-foreground">{conversation.lastMessagePreview ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(conversation.lastMessageAt)}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {conversation.assignedAgentName ?? 'Unassigned'}
                  </TableCell>
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
