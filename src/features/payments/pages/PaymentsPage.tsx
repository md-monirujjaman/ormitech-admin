import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { PaymentStatusBadge } from '@/components/shared/StatusBadge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePayments } from '@/features/billing/hooks';
import { useOrganizations } from '@/features/organizations/hooks';
import { formatBillingDate, formatCurrency } from '@/lib/billing';
import { PAYMENT_STATUSES, type PaymentMethod, type PaymentStatus } from '@/types/billing';

const PAGE_SIZE = 10;

const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: 'Card',
  bank_transfer: 'Bank transfer',
  mobile_wallet: 'Mobile wallet',
  manual: 'Manual',
};

export default function PaymentsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const paymentsQuery = usePayments({ query, status, page, pageSize: PAGE_SIZE });
  const organizationsQuery = useOrganizations({ page: 1, pageSize: 200 });

  const organizations = organizationsQuery.data?.items ?? [];
  const organizationName = (id: string) => organizations.find((organization) => organization.id === id)?.name ?? id;
  const data = paymentsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Payment records reported by the billing backend. No gateway is integrated — the Admin reads, it never charges."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search organization, payment ID or reference…"
            className="w-full sm:max-w-sm"
            aria-label="Search payments"
          />
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as PaymentStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PAYMENT_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value.charAt(0) + value.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {paymentsQuery.isError ? (
          <ErrorState className="m-4" title="Couldn't load payments" onRetry={() => void paymentsQuery.refetch()} />
        ) : paymentsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : data && data.items.length === 0 ? (
          <EmptyState className="m-4 border-0" icon={Wallet} title="No payments match these filters" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Transaction reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{payment.id}</code>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{organizationName(payment.organizationId)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">{formatCurrency(payment.amount, payment.currency)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{payment.currency}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{METHOD_LABEL[payment.method]}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(payment.createdAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{payment.invoiceId ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{payment.transactionReference ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
