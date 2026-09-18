import { useState } from 'react';
import { Ban, CheckCircle2, Eye, MoreHorizontal, Pencil, Plus, UserCog, Users } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UserStatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserFormDialog } from '@/features/organizations/components/UserFormDialog';
import {
  useCreateOrganizationUser,
  useOrganizationUsers,
  useSetOrganizationUserStatus,
  useUpdateOrganizationUser,
} from '@/features/organizations/hooks';
import { ORGANIZATION_USER_ROLES, type OrganizationUser, type OrganizationUserRole } from '@/types/organization';

function formatDate(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function UsersTab({ organizationId, canWrite }: { organizationId: string; canWrite: boolean }) {
  const usersQuery = useOrganizationUsers(organizationId);
  const createUser = useCreateOrganizationUser(organizationId);
  const updateUser = useUpdateOrganizationUser(organizationId);
  const setStatus = useSetOrganizationUserStatus(organizationId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationUser | null>(null);
  const [viewing, setViewing] = useState<OrganizationUser | null>(null);
  const [roleChange, setRoleChange] = useState<{ user: OrganizationUser; role: OrganizationUserRole } | null>(null);
  const [statusChange, setStatusChange] = useState<{ user: OrganizationUser; disable: boolean } | null>(null);

  const users = usersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {users.length} user{users.length === 1 ? '' : 's'} in this organization.
        </p>
        {canWrite && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Add user
          </Button>
        )}
      </div>

      <Card>
        {usersQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            className="border-0"
            icon={Users}
            title="No users yet"
            description="This organization has no user accounts. Add one to give someone access to the customer dashboard."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(user.lastActiveAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
                          <MoreHorizontal className="size-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setViewing(user)}>
                          <Eye className="size-4" aria-hidden />
                          View
                        </DropdownMenuItem>
                        {canWrite && (
                          <>
                            <DropdownMenuItem onSelect={() => setEditing(user)}>
                              <Pencil className="size-4" aria-hidden />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <UserCog className="mr-2 size-4" aria-hidden />
                                Change role
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {ORGANIZATION_USER_ROLES.map((role) => (
                                  <DropdownMenuItem
                                    key={role}
                                    disabled={role === user.role}
                                    onSelect={() => setRoleChange({ user, role })}
                                    className="capitalize"
                                  >
                                    {role}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            {user.status === 'disabled' ? (
                              <DropdownMenuItem onSelect={() => setStatusChange({ user, disable: false })}>
                                <CheckCircle2 className="size-4" aria-hidden />
                                Enable
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setStatusChange({ user, disable: true })}
                              >
                                <Ban className="size-4" aria-hidden />
                                Disable
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={createUser.isPending}
        error={createUser.error}
        onSubmit={(values) => createUser.mutate(values, { onSuccess: () => setCreateOpen(false) })}
      />

      {editing && (
        <UserFormDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          user={editing}
          isPending={updateUser.isPending}
          error={updateUser.error}
          onSubmit={(values) => updateUser.mutate({ userId: editing.id, input: values }, { onSuccess: () => setEditing(null) })}
        />
      )}

      {viewing && (
        <Dialog open onOpenChange={(open) => !open && setViewing(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle>{viewing.name}</DialogTitle>
              <DialogDescription>{viewing.email}</DialogDescription>
            </DialogHeader>
            <dl className="divide-y divide-border py-2">
              {[
                { label: 'User ID', value: <span className="font-mono text-xs">{viewing.id}</span> },
                { label: 'Role', value: <span className="capitalize">{viewing.role}</span> },
                { label: 'Status', value: <UserStatusBadge status={viewing.status} /> },
                { label: 'Last active', value: formatDate(viewing.lastActiveAt) },
                { label: 'Created', value: formatDate(viewing.createdAt) },
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

      {roleChange && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setRoleChange(null)}
          title="Change user role"
          description={`${roleChange.user.name} will change from ${roleChange.user.role} to ${roleChange.role}, which changes what they can do in the customer dashboard.`}
          confirmLabel="Change role"
          isPending={updateUser.isPending}
          onConfirm={() =>
            updateUser.mutate(
              {
                userId: roleChange.user.id,
                input: {
                  name: roleChange.user.name,
                  email: roleChange.user.email,
                  role: roleChange.role,
                  status: roleChange.user.status,
                },
              },
              { onSuccess: () => setRoleChange(null) },
            )
          }
        />
      )}

      {statusChange && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setStatusChange(null)}
          title={statusChange.disable ? 'Disable user' : 'Enable user'}
          description={
            statusChange.disable
              ? `${statusChange.user.name} will immediately lose access to the customer dashboard.`
              : `${statusChange.user.name} will be able to sign in to the customer dashboard again.`
          }
          confirmLabel={statusChange.disable ? 'Disable' : 'Enable'}
          destructive={statusChange.disable}
          isPending={setStatus.isPending}
          onConfirm={() =>
            setStatus.mutate(
              { userId: statusChange.user.id, status: statusChange.disable ? 'disabled' : 'active' },
              { onSuccess: () => setStatusChange(null) },
            )
          }
        />
      )}
    </div>
  );
}
