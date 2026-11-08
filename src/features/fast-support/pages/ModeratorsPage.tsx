import { ArrowLeft, Plus, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/apiError';
import { ROUTES } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { fastSupportApi } from '../api';
import { useCreateModerator, useModerators, useUpdateModerator } from '../hooks';
import { formatSeconds, formatWhen, STATUS_INFO } from '../status';
import { PERMISSION_LABELS, SUPPORT_PERMISSIONS, type Moderator, type SupportPermission } from '../types';

const DEFAULTS: SupportPermission[] = ['support.view', 'support.accept', 'support.reply', 'support.manage_assigned', 'support.ai.toggle', 'support.notes.create', 'support.resolve', 'support.reopen'];

function PermissionPicker({ value, onChange }: { value: SupportPermission[]; onChange: (next: SupportPermission[]) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">What this moderator may do</legend>
      {SUPPORT_PERMISSIONS.map((permission) => (
        <label key={permission} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-border"
            checked={value.includes(permission)}
            onChange={(event) => onChange(event.target.checked ? [...value, permission] : value.filter((item) => item !== permission))}
          />
          {PERMISSION_LABELS[permission]}
        </label>
      ))}
      <p className="text-xs text-muted-foreground">A moderator can never reach organizations, billing, plans, channels or other administrators, whatever is ticked here.</p>
    </fieldset>
  );
}

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateModerator();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [permissions, setPermissions] = useState<SupportPermission[]>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setForm({ name: '', email: '', password: '' });
      setPermissions(DEFAULTS);
      setError(null);
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const submit = async () => {
    setError(null);
    try {
      await create.mutateAsync({ ...form, permissions });
      onOpenChange(false);
    } catch (failure) {
      setError(apiErrorMessage(failure, 'The moderator could not be created.'));
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New moderator</DialogTitle>
          <DialogDescription>They sign in to this panel and see Fast Support only.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5"><Label htmlFor="mod-name">Name</Label><Input id="mod-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={100} /></div>
          <div className="space-y-1.5"><Label htmlFor="mod-email">Email</Label><Input id="mod-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength={254} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="mod-password">Password</Label>
            <Input id="mod-password" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <p className="text-xs text-muted-foreground">At least 12 characters with a lowercase letter, an uppercase letter and a number.</p>
          </div>
          <PermissionPicker value={permissions} onChange={setPermissions} />
          {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !form.name.trim() || !form.email.trim() || !form.password}>{create.isPending ? 'Creating…' : 'Create moderator'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ moderator, onClose }: { moderator: Moderator | null; onClose: () => void }) {
  const update = useUpdateModerator();
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<SupportPermission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const activity = useQuery({ queryKey: ['fast-support', 'moderator-activity', moderator?.id], queryFn: () => fastSupportApi.moderatorActivity(moderator!.id), enabled: Boolean(moderator) });
  useEffect(() => {
    if (moderator) {
      setName(moderator.name);
      setPermissions(moderator.permissions);
      setError(null);
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moderator?.id]);
  const save = async () => {
    if (!moderator) return;
    setError(null);
    try {
      await update.mutateAsync({ id: moderator.id, name: name.trim(), permissions });
      onClose();
    } catch (failure) {
      setError(apiErrorMessage(failure, 'The changes could not be saved.'));
    }
  };
  return (
    <Dialog open={moderator !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{moderator?.name}</DialogTitle>
          <DialogDescription>{moderator?.email}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="space-y-1.5"><Label htmlFor="edit-name">Name</Label><Input id="edit-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /></div>
            <PermissionPicker value={permissions} onChange={setPermissions} />
            {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
            <Button type="submit" disabled={update.isPending || name.trim().length < 2}>{update.isPending ? 'Saving…' : 'Save changes'}</Button>
          </form>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Requests</h4>
              {activity.isLoading ? <Skeleton className="mt-2 h-20" /> : activity.isError ? <p className="mt-2 text-xs text-destructive">{apiErrorMessage(activity.error, 'Activity could not be loaded.')}</p> : (activity.data?.assigned ?? []).length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No requests taken yet.</p> : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {activity.data!.assigned.slice(0, 8).map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-2">
                      <Link className="min-w-0 truncate hover:underline" to={`${ROUTES.fastSupport}/${row.id}`}>{row.subject}</Link>
                      <Badge variant={STATUS_INFO[row.status].variant}>{STATUS_INFO[row.status].label}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold">Recent activity</h4>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(activity.data?.events ?? []).slice(0, 8).map((event) => <li key={event.id}><span className="font-medium text-foreground">{event.eventType.replace(/_/g, ' ')}</span> · {formatWhen(event.createdAt)}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Moderator accounts, for super admins: who can moderate, what they may do, and how they are doing. */
export default function ModeratorsPage() {
  const { can } = usePermissions();
  const allowed = can('fastsupport.moderators');
  const moderators = useModerators(allowed);
  const update = useUpdateModerator();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Moderator | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Link to={ROUTES.fastSupport} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Support Desk
      </Link>
      <PageHeader
        title="Moderators"
        description="People who answer Fast Support requests. A moderator sees Fast Support and nothing else in this panel."
        showMockNotice={false}
        actions={allowed && <Button onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden /> New moderator</Button>}
      />
      {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
      {!allowed ? (
        <EmptyState icon={UserCog} title="Only a super admin manages moderators" description="Ask a super admin to add or change a moderator." />
      ) : moderators.isError ? (
        <ErrorState title="Couldn't load moderators" description={apiErrorMessage(moderators.error, 'The OrmiTech API refused the request.')} onRetry={() => moderators.refetch()} />
      ) : moderators.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (moderators.data ?? []).length === 0 ? (
        <EmptyState icon={UserCog} title="No moderators yet" description="Add the first one. They get an account in this panel with Fast Support only." />
      ) : (
        <div className="grid gap-3">
          {moderators.data!.map((moderator) => (
            <Card key={moderator.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{moderator.name}</h3>
                  <Badge variant={moderator.active ? 'success' : 'outline'}>{moderator.active ? 'Active' : 'Switched off'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{moderator.email}</p>
                <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                  <span>{moderator.openSessions} open</span>
                  <span>{moderator.resolvedSessions} resolved</span>
                  <span>First reply {formatSeconds(moderator.averageFirstReplySeconds)}</span>
                  <span>Last sign-in {moderator.lastLoginAt ? formatWhen(moderator.lastLoginAt) : 'never'}</span>
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={moderator.active}
                  disabled={update.isPending}
                  aria-label={moderator.active ? `Switch ${moderator.name} off` : `Switch ${moderator.name} on`}
                  onCheckedChange={async (active) => {
                    setError(null);
                    try {
                      await update.mutateAsync({ id: moderator.id, active });
                    } catch (failure) {
                      setError(apiErrorMessage(failure, 'The change could not be saved.'));
                    }
                  }}
                />
                {moderator.active ? 'On' : 'Off'}
              </label>
              <Button variant="outline" size="sm" onClick={() => setEditing(moderator)}>Manage</Button>
            </Card>
          ))}
        </div>
      )}
      <CreateDialog open={creating} onOpenChange={setCreating} />
      <EditDialog moderator={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
