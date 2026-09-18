import { useState } from 'react';
import { Ban, Download, Eye, FileText, MoreHorizontal } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { InvoiceStatusBadge } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInvoices, useVoidInvoice } from '@/features/billing/hooks';
import { useOrganizations } from '@/features/organizations/hooks';
import { usePermissions } from '@/hooks/usePermissions';
import { formatBillingDate, formatCurrency } from '@/lib/billing';
import { INVOICE_STATUSES, type Invoice, type InvoiceStatus } from '@/types/billing';

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const { can } = usePermissions();
  const canWrite = can('invoices.write');

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const invoicesQuery = useInvoices({ query, status, page, pageSize: PAGE_SIZE });
  const organizationsQuery = useOrganizations({ page: 1, pageSize: 200 });
  const voidInvoice = useVoidInvoice();

  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [voiding, setVoiding] = useState<Invoice | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<Invoice | null>(null);

  const organizations = organizationsQuery.data?.items ?? [];
  const organizationName = (id: string) => organizations.find((organization) => organization.id === id)?.name ?? id;
  const data = invoicesQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Invoices issued against subscriptions. PDF generation is a future ormitech-api capability." />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search invoice number or organization…"
            className="w-full sm:max-w-sm"
            aria-label="Search invoices"
          />
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as InvoiceStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {INVOICE_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value.charAt(0) + value.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {invoicesQuery.isError ? (
          <ErrorState className="m-4" title="Couldn't load invoices" onRetry={() => void invoicesQuery.refetch()} />
        ) : invoicesQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : data && data.items.length === 0 ? (
          <EmptyState className="m-4 border-0" icon={FileText} title="No invoices match these filters" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead className="w-10 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{invoice.id}</code>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{organizationName(invoice.organizationId)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">{invoice.number}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invoice.currency}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(invoice.issuedAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(invoice.dueAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatBillingDate(invoice.paidAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for invoice ${invoice.number}`}>
                            <MoreHorizontal className="size-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setViewing(invoice)}>
                            <Eye className="size-4" aria-hidden />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDownloadNotice(invoice)}>
                            <Download className="size-4" aria-hidden />
                            Download
                          </DropdownMenuItem>
                          {canWrite && invoice.status !== 'PAID' && invoice.status !== 'VOID' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setVoiding(invoice)}>
                                <Ban className="size-4" aria-hidden />
                                Void
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
          </>
        )}
      </Card>

      {viewing && (
        <Dialog open onOpenChange={(open) => !open && setViewing(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle>{viewing.number}</DialogTitle>
              <DialogDescription>{organizationName(viewing.organizationId)}</DialogDescription>
            </DialogHeader>
            <dl className="divide-y divide-border py-2">
              {[
                { label: 'Invoice ID', value: <span className="font-mono text-xs">{viewing.id}</span> },
                { label: 'Amount', value: formatCurrency(viewing.amount, viewing.currency) },
                { label: 'Status', value: <InvoiceStatusBadge status={viewing.status} /> },
                { label: 'Issued', value: formatBillingDate(viewing.issuedAt) },
                { label: 'Due', value: formatBillingDate(viewing.dueAt) },
                { label: 'Paid', value: formatBillingDate(viewing.paidAt) },
                { label: 'Subscription', value: viewing.subscriptionId ?? '—' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-sm text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </DialogContent>
        </Dialog>
      )}

      {downloadNotice && (
        <Dialog open onOpenChange={(open) => !open && setDownloadNotice(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle>Invoice PDF not available yet</DialogTitle>
              <DialogDescription>
                {downloadNotice.number} can&apos;t be downloaded because PDF generation doesn&apos;t exist yet. When it does, ormitech-api will
                render and sign the file and `invoiceApi.downloadUrl` will return a short-lived link — the Admin only follows it.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setDownloadNotice(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {voiding && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setVoiding(null)}
          title="Void invoice"
          description={`${voiding.number} for ${organizationName(voiding.organizationId)} will be marked void. It stops being collectable and stays on the record for audit.`}
          confirmLabel="Void invoice"
          destructive
          isPending={voidInvoice.isPending}
          onConfirm={() => voidInvoice.mutate(voiding.id, { onSuccess: () => setVoiding(null) })}
        />
      )}
    </div>
  );
}
