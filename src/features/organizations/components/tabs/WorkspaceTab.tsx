import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Pagination } from '@/components/shared/Pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { workspaceApi, type StatusCount } from '@/api/workspaceApi';

const number = new Intl.NumberFormat();
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'never');

function bytes(value: number) {
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Breakdown({ title, rows, money }: { title: string; rows: StatusCount[]; money?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
        {rows.map((row) => (
          <div key={row.status} className="flex items-center justify-between text-sm">
            <span className="capitalize">{row.status.replace(/_/g, ' ')}</span>
            <span className="tabular-nums text-muted-foreground">
              {number.format(row.count)}
              {money && row.value !== undefined ? ` · ${number.format(row.value)}` : ''}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Orders({ organizationId }: { organizationId: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['workspace', organizationId, 'orders', page, search],
    queryFn: () => workspaceApi.orders(organizationId, { page, search: search || undefined }),
    placeholderData: keepPreviousData,
  });
  return (
    <Card>
      <div className="border-b border-border p-4">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Order number, customer or phone…" className="sm:max-w-xs" aria-label="Search orders" />
      </div>
      {query.isError ? (
        <ErrorState title="Couldn't load orders" description="Retry in a moment." onRetry={() => query.refetch()} />
      ) : !query.data ? (
        <LoadingState label="Loading orders…" />
      ) : query.data.items.length === 0 ? (
        <EmptyState title="No orders" description="This workspace has no orders matching that search." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    {order.customerName}
                    <div className="text-xs text-muted-foreground">{order.customerPhone ?? ''}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{order.status}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{order.itemCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{number.format(order.total)} {order.currency}</TableCell>
                  <TableCell>{date(order.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={query.data.meta.limit} total={query.data.meta.total} onPageChange={setPage} />
        </>
      )}
    </Card>
  );
}

function Customers({ organizationId }: { organizationId: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['workspace', organizationId, 'customers', page, search],
    queryFn: () => workspaceApi.customers(organizationId, { page, search: search || undefined }),
    placeholderData: keepPreviousData,
  });
  return (
    <Card>
      <div className="border-b border-border p-4">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name, phone or email…" className="sm:max-w-xs" aria-label="Search customers" />
      </div>
      {query.isError ? (
        <ErrorState title="Couldn't load customers" description="Retry in a moment." onRetry={() => query.refetch()} />
      ) : !query.data ? (
        <LoadingState label="Loading customers…" />
      ) : query.data.items.length === 0 ? (
        <EmptyState title="No customers" description="This workspace has no customers matching that search." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Conversations</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead>Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{[customer.phone, customer.email].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{customer.conversations}</TableCell>
                  <TableCell className="text-right tabular-nums">{customer.orders}</TableCell>
                  <TableCell>{date(customer.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={query.data.meta.limit} total={query.data.meta.total} onPageChange={setPage} />
        </>
      )}
    </Card>
  );
}

/** A customer's workspace from A to Z. Read only: changes live in the Users, Plan, Features and Usage tabs. */
export function WorkspaceTab({ organizationId }: { organizationId: string }) {
  const query = useQuery({ queryKey: ['workspace', organizationId, 'overview'], queryFn: () => workspaceApi.overview(organizationId) });
  if (query.isLoading) return <LoadingState label="Loading workspace…" />;
  if (query.isError || !query.data) return <ErrorState title="Couldn't load the workspace" description="Retry in a moment." onRetry={() => query.refetch()} />;

  const { totals, team, channels, unassigned, ai, knowledge } = query.data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Team members" value={number.format(totals.members)} />
        <Stat label="Customers" value={number.format(totals.customers)} />
        <Stat label="Leads" value={number.format(totals.leads)} hint={`${unassigned.leads} unassigned`} />
        <Stat label="Orders" value={number.format(totals.orders)} hint={`${number.format(totals.orderValue)} total value`} />
        <Stat label="Conversations" value={number.format(totals.conversations)} hint={`${unassigned.conversations} unassigned`} />
        <Stat label="Messages" value={number.format(totals.messages)} hint={`last ${dateTime(totals.lastMessageAt)}`} />
        <Stat label="Products" value={number.format(totals.products)} />
        <Stat label="Storage" value={bytes(totals.storageBytes)} hint={`${number.format(totals.files)} files`} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Breakdown title="Leads by status" rows={query.data.leadsByStatus} />
        <Breakdown title="Orders by status (count · value)" rows={query.data.ordersByStatus} money />
        <Breakdown title="Conversations by status" rows={query.data.conversationsByStatus} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Who handles what</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Conversations</TableHead>
              <TableHead className="text-right">Open now</TableHead>
              <TableHead>Last active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <span className="font-medium">{member.name}</span>
                  {member.status !== 'active' && <Badge variant="warning" className="ml-2 capitalize">{member.status}</Badge>}
                  <div className="text-xs text-muted-foreground">{member.email}</div>
                </TableCell>
                <TableCell className="capitalize">{member.role}</TableCell>
                <TableCell className="text-right tabular-nums">{member.leads}</TableCell>
                <TableCell className="text-right tabular-nums">{member.conversations}</TableCell>
                <TableCell className="text-right tabular-nums">{member.openConversations}</TableCell>
                <TableCell>{dateTime(member.lastActiveAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Channels ({channels.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {channels.length === 0 && <p className="text-sm text-muted-foreground">No channels connected.</p>}
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between text-sm">
                <span>{channel.name} <span className="text-muted-foreground">· {channel.type}</span></span>
                <Badge variant={channel.status === 'connected' ? 'success' : 'outline'} className="capitalize">{channel.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">AI</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span>Replies</span><span className="tabular-nums">{number.format(ai.replies)}</span></div>
            <div className="flex justify-between"><span>Tokens</span><span className="tabular-nums">{number.format(ai.tokens)}</span></div>
            <div className="flex justify-between"><span>Cost</span><span className="tabular-nums">${ai.cost.toFixed(4)}</span></div>
            <div className="flex justify-between"><span>Knowledge sources</span><span className="tabular-nums">{knowledge.sources}{knowledge.failed ? ` (${knowledge.failed} failed)` : ''}</span></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders ({number.format(totals.orders)})</TabsTrigger>
          <TabsTrigger value="customers">Customers ({number.format(totals.customers)})</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><Orders organizationId={organizationId} /></TabsContent>
        <TabsContent value="customers"><Customers organizationId={organizationId} /></TabsContent>
      </Tabs>
    </div>
  );
}
