import { useState } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronRight, Info, KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useRoleSummaries, type RoleSummary } from '../hooks';

const isForbidden = (error: unknown): boolean => axios.isAxiosError(error) && error.response?.status === 403;

/**
 * The roles an administrator can hold.
 *
 * Read-only, because a role is not data the panel may invent. `admin_roles` is seeded by migration
 * (0014 added `super_admin`), and the API checks the name — so a role created at runtime would be a row no
 * endpoint honours and no guard knows about. Adding one is a migration and a review, which is the point.
 *
 * The page separates two things an operator is otherwise left to confuse:
 *
 *  - what ormitech-api **refuses** without the role, which is a security boundary, and
 *  - what this panel **shows or hides** for it, which is presentation and nothing more.
 *
 * Today only the first list has an entry, and only for `super_admin`. Saying so is more useful than a page
 * of permission chips that look enforced and are not.
 */
export default function RolesPage() {
  const { summaries, administratorsExamined, administratorsTotal, isLoading, isError, error, refetch } =
    useRoleSummaries();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isForbidden(error)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Roles & Permissions" description="The roles an administrator can hold." showMockNotice={false} />
        <EmptyState
          icon={ShieldAlert}
          title="This needs the super_admin role"
          description="Roles are listed by the administrator management endpoints, which only a super admin may call."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Defined by migration, enforced by ormitech-api. Read-only here."
        showMockNotice={false}
      />

      <Card className="flex gap-3 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          A role is a row in <code className="font-mono text-xs text-foreground">admin_roles</code>, seeded by
          migration, and ormitech-api checks it by name. Per-role permission sets are not stored yet:{' '}
          <code className="font-mono text-xs text-foreground">admin_role_permissions</code> holds no rows and no
          endpoint reads it, so what a role grants is what the API refuses without it — listed per role below.
          Everything else a role changes is what this panel chooses to show, which is not a security boundary.
        </p>
      </Card>

      {isError ? (
        <ErrorState
          title="Couldn't load roles"
          description={apiErrorMessage(error, 'The OrmiTech API refused the request.')}
          onRetry={refetch}
        />
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : summaries.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No roles defined"
          description="admin_roles is empty. Migration 0014 seeds super_admin — run the migrations against this database."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="whitespace-nowrap">Enforced by the API</TableHead>
                <TableHead className="whitespace-nowrap">Panel visibility</TableHead>
                <TableHead className="whitespace-nowrap">Administrators</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((role) => (
                <RoleRows
                  key={role.name}
                  role={role}
                  expanded={expanded === role.name}
                  onToggle={() => setExpanded(expanded === role.name ? null : role.name)}
                />
              ))}
            </TableBody>
          </Table>
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Administrator counts taken over {administratorsExamined} of {administratorsTotal} administrators.
          </p>
        </Card>
      )}
    </div>
  );
}

function RoleRows({
  role,
  expanded,
  onToggle,
}: {
  role: RoleSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="align-top">
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? `Hide what ${role.name} grants` : `Show what ${role.name} grants`}
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          >
            <Chevron className="size-4" aria-hidden />
          </button>
        </TableCell>
        <TableCell className="align-top">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs text-foreground">{role.name}</span>
            {role.enforced.length > 0 && (
              <Badge variant="default" className="gap-1">
                <ShieldCheck className="size-3" aria-hidden />
                enforced
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="max-w-80 align-top text-sm text-muted-foreground">{role.description || '—'}</TableCell>
        <TableCell className="align-top text-sm">
          {role.enforced.length > 0 ? (
            <span className="text-foreground">
              {role.enforced.length} {role.enforced.length === 1 ? 'endpoint group' : 'endpoint groups'}
            </span>
          ) : (
            <span className="text-muted-foreground">nothing</span>
          )}
        </TableCell>
        <TableCell className="align-top text-sm text-muted-foreground">
          {role.panelPermissions.length} {role.panelPermissions.length === 1 ? 'rule' : 'rules'}
        </TableCell>
        <TableCell className="align-top text-sm text-foreground">{role.administrators}</TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="bg-muted/40 p-0">
            <div className="grid gap-6 p-4 lg:grid-cols-2">
              <section>
                <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
                  Refused without this role
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Enforced on the server by ormitech-api. This is the security boundary.
                </p>
                {role.enforced.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nothing. An administrator without this role reaches every admin endpoint except the ones
                    listed under <span className="font-mono text-xs">super_admin</span>.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {role.enforced.map((item) => (
                      <li key={item} className="text-sm text-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-sm font-medium text-foreground">Shown in this panel</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Which screens and controls the panel renders for it. Presentation only — hiding a button is
                  not a permission, and every write is authorized again by the API.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {role.panelPermissions.map((permission) => (
                    <Badge key={permission} variant="outline" className="font-mono text-[11px]">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </section>

              <section className={cn('lg:col-span-2', role.administrators === 0 && 'text-muted-foreground')}>
                <h3 className="text-sm font-medium text-foreground">
                  Administrators holding it ({role.administrators})
                </h3>
                {role.administrators === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">Nobody.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {role.administratorEmails.map((email) => (
                      <Badge key={email} variant="secondary">
                        {email}
                      </Badge>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
