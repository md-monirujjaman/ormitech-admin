import { useState } from 'react';
import { Plus, Search, ShieldCheck, UserCog } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import type { AdminAccount } from '@/types/auth';
import { AdminFormDialog } from '../components/AdminFormDialog';
import { useAdmins, useCreateAdmin, useUpdateAdmin } from '../hooks';
import { SUPER_ADMIN_ROLE } from '../roles';

const PAGE_SIZE = 20;

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

type PendingChange =
  | { kind: 'status'; admin: AdminAccount; status: 'active' | 'disabled' }
  | { kind: 'role'; admin: AdminAccount; superAdmin: boolean };

/**
 * Who can sign in to this panel.
 *
 * Every control here is also enforced by `ormitech-api`, which refuses the whole endpoint without the
 * `super_admin` role and refuses an administrator's attempt to disable their own account or drop their own
 * role. This screen hides what it cannot use and says what the API said when it refuses anyway — the UI is
 * not the boundary.
 *
 * There is no delete. An administrator is disabled, which keeps their audit entries attributable.
 */
export default function AdminsPage() {
  const { admin: currentAdmin } = useAuth();
  const { can } = usePermissions();
  const canWrite = can('admin_users.write');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<PendingChange | null>(null);

  const adminsQuery = useAdmins({
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });
  const createAdmin = useCreateAdmin();
  const updateAdmin = useUpdateAdmin();

  const data = adminsQuery.data;
  const admins = data?.items ?? [];

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const confirmText = (change: PendingChange) =>
    change.kind === 'status'
      ? change.status === 'disabled'
        ? `${change.admin.name} will be signed out and refused at sign-in until re-enabled.`
        : `${change.admin.name} will be able to sign in again.`
      : change.superAdmin
        ? `${change.admin.name} will be able to create, disable and re-role administrators — including you.`
        : `${change.admin.name} will keep their access to the panel but lose administrator management.`;

  const applyChange = async () => {
    if (!pending) return;
    const input =
      pending.kind === 'status'
        ? { status: pending.status }
        : { roles: pending.superAdmin ? [SUPER_ADMIN_ROLE] : [] };
    try {
      await updateAdmin.mutateAsync({ id: pending.admin.id, input });
      setPending(null);
    } catch {
      // Left open, with the API's reason shown inside the dialog.
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Users"
        description="Platform administrators and the role that lets them manage each other."
        showMockNotice={false}
        actions={
          canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden />
              New administrator
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-8"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            aria-label="Search administrators"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as typeof status);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {adminsQuery.isError ? (
        <ErrorState
          title="Couldn't load administrators"
          description={apiErrorMessage(adminsQuery.error, 'The OrmiTech API refused the request.')}
          onRetry={() => adminsQuery.refetch()}
        />
      ) : adminsQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : admins.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No administrators match"
          description="Try a different search term, or clear the status filter."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Administrator</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sign-in</TableHead>
                {canWrite && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((row) => {
                const isSuper = row.roles.includes(SUPER_ADMIN_ROLE);
                const isSelf = row.id === currentAdmin?.id;

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {row.name}
                          {isSelf && <span className="ml-2 text-xs font-normal text-muted-foreground">you</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isSuper ? (
                        <Badge variant="default" className="gap-1">
                          <ShieldCheck className="size-3" aria-hidden />
                          Super admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'active' ? 'success' : 'destructive'}>
                        {row.status === 'active' ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(row.lastLoginAt)}</TableCell>
                    {canWrite && (
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            // Refused by the API for your own account as well; hidden here so the obvious
                            // lockout is not offered in the first place.
                            disabled={isSelf}
                            onClick={() => setPending({ kind: 'role', admin: row, superAdmin: !isSuper })}
                          >
                            {isSuper ? 'Remove super admin' : 'Make super admin'}
                          </Button>
                          <Button
                            variant={row.status === 'active' ? 'outline' : 'default'}
                            size="sm"
                            disabled={isSelf}
                            onClick={() =>
                              setPending({
                                kind: 'status',
                                admin: row,
                                status: row.status === 'active' ? 'disabled' : 'active',
                              })
                            }
                          >
                            {row.status === 'active' ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
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

      <AdminFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(input) => createAdmin.mutateAsync(input)}
        isPending={createAdmin.isPending}
        error={createAdmin.error}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending?.kind === 'role' ? 'Change role' : 'Change status'}
        description={pending ? confirmText(pending) : ''}
        confirmLabel="Apply"
        destructive={pending?.kind === 'status' && pending.status === 'disabled'}
        isPending={updateAdmin.isPending}
        onConfirm={applyChange}
      >
        {updateAdmin.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {apiErrorMessage(updateAdmin.error, 'The OrmiTech API refused the change.')}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
