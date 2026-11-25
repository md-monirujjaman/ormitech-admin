import { Search } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadFailed } from '@/features/ai-catalog/components/LoadFailed';
import { apiErrorMessage } from '@/lib/apiError';
import { formatCredits, formatUsd, formatWhen } from '../format';
import { useCreditAccount, useCreditAccounts, usePlanBudgets, useSetAccountPlan } from '../hooks';
import { Notice, Problem, Stat, type NoticeState } from './shared';

const SOURCE_LABEL: Record<string, string> = { plan: 'Plan credit', legacy: 'Earlier grant (converted)' };

/** How the money flows, in the words an operator uses. Shown above the list so nobody has to ask. */
function Guide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How credits work</CardTitle>
        <CardDescription>Nothing here is typed in by hand per customer. You only choose a plan; the credits follow.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Plans &amp; budgets tab:</span> give each plan a USD budget and a markup. That budget becomes credits at the credit value on the Settings tab.
          </li>
          <li>
            <span className="font-medium text-foreground">This tab:</span> every user has one plan (new sign-ups start on Free). Change it here and the credits for that plan are added to the user’s main wallet by themselves.
          </li>
          <li>
            <span className="font-medium text-foreground">One wallet per user:</span> all the workspaces a user owns spend from the same balance. Unused credits are never taken back, and a smaller plan takes nothing away.
          </li>
          <li>
            <span className="font-medium text-foreground">Settings tab:</span> switch the mode to Enforce when you are ready for the balance to be required. Every request is charged at the provider’s real cost plus the plan markup.
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}

function Account({ userId, canWrite }: { userId: string; canWrite: boolean }) {
  const query = useCreditAccount(userId);
  const plans = usePlanBudgets();
  const setPlan = useSetAccountPlan();
  const [choice, setChoice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError || !query.data) return <LoadFailed error={query.error} what="this account" onRetry={() => void query.refetch()} />;
  const data = query.data;
  const options = plans.data?.items ?? [];
  const selected = choice ?? data.plan.slug;

  return (
    <div className="space-y-4">
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      <div>
        <p className="text-base font-semibold">{data.user.name}</p>
        <p className="text-sm text-muted-foreground">{data.user.email}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total allocated" value={`${formatCredits(data.wallet.allocatedCredits)} credits`} hint={`${formatUsd(data.wallet.allocatedUsd)} of plan budget`} />
        <Stat label="Available" value={`${formatCredits(data.wallet.availableCredits)} credits`} hint={`${formatCredits(data.wallet.heldCredits)} held for requests in progress`} />
        <Stat label="Used" value={`${formatCredits(data.wallet.usedCredits)} credits`} />
        <Stat label="Plan" value={data.plan.slug} hint={data.plan.updatedAt ? `changed ${formatWhen(data.plan.updatedAt)}` : 'default for new users'} />
      </div>

      {canWrite && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="account-plan">Change this user’s plan</Label>
            <select id="account-plan" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={selected} onChange={(event) => setChoice(event.target.value)}>
              {[{ slug: 'free', name: 'Free' }, ...options.filter((plan) => plan.slug !== 'free')].map((plan) => (
                <option key={plan.slug} value={plan.slug}>
                  {plan.name} ({plan.slug})
                </option>
              ))}
            </select>
          </div>
          <Button type="button" disabled={selected === data.plan.slug || setPlan.isPending} onClick={() => { setPlan.reset(); setConfirming(true); }}>
            Set plan
          </Button>
        </div>
      )}
      {setPlan.error ? <Problem>{apiErrorMessage(setPlan.error, 'The plan could not be changed.')}</Problem> : null}

      <section aria-label="Used per workspace" className="space-y-2">
        <h3 className="text-sm font-semibold">Used per workspace</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workspace</TableHead>
              <TableHead className="text-right">AI uses</TableHead>
              <TableHead className="text-right">Credits used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.workspaces.map((row) => (
              <TableRow key={row.organizationId}>
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right tabular-nums">{row.uses}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCredits(row.usedCredits)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section aria-label="Recent use" className="space-y-2">
        <h3 className="text-sm font-semibold">Recent use (date and time)</h3>
        {data.recentUse.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credit has been used yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead className="text-right">Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentUse.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatWhen(row.createdAt)}</TableCell>
                  <TableCell>{row.workspaceName ?? 'Removed workspace'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCredits(row.credits)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section aria-label="Allocations" className="space-y-2">
        <h3 className="text-sm font-semibold">Credit allocated by plan</h3>
        {data.allocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credit has been allocated yet. It is added by itself the first time the user’s AI is used or the plan is set.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Budget added</TableHead>
                <TableHead className="text-right">Credits added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.allocations.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatWhen(row.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.planSlug}</Badge>
                  </TableCell>
                  <TableCell>{SOURCE_LABEL[row.source] ?? row.source}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(row.usdGranted)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCredits(row.credits)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {confirming && selected !== data.plan.slug && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || setPlan.isPending ? undefined : setConfirming(false))}
          title={`Move ${data.user.name} to ${selected}?`}
          description="The credit for that plan is added to the user’s wallet now. Credits the user already has are kept, and a smaller plan takes nothing back."
          confirmLabel="Set plan"
          isPending={setPlan.isPending}
          onConfirm={() =>
            setPlan.mutate(
              { userId, planSlug: selected },
              {
                onSuccess: () => {
                  setChoice(null);
                  setConfirming(false);
                  setNotice({ message: `The plan is now ${selected}. Its credit was added to the wallet.`, tone: 'success' });
                },
              },
            )
          }
        />
      )}
    </div>
  );
}

/** Every user's main wallet: plan, what was allocated, what is left, what each workspace used and when. Plans are set here, per user. */
export function AccountsTab({ canWrite }: { canWrite: boolean }) {
  const [term, setTerm] = useState('');
  const [applied, setApplied] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const list = useCreditAccounts(applied);

  return (
    <div className="space-y-6">
      <Guide />
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>Find a user by name, email or user ID. Pick one to see their wallet and change their plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap items-end gap-3" noValidate onSubmit={(event) => { event.preventDefault(); setSelected(null); setApplied(term.trim()); }}>
            <div className="space-y-1.5">
              <Label htmlFor="account-search">Name, email or user ID</Label>
              <Input id="account-search" value={term} autoComplete="off" className="w-96 max-w-full" onChange={(event) => setTerm(event.target.value)} />
            </div>
            <Button type="submit" variant="outline">
              <Search className="size-4" aria-hidden /> Find
            </Button>
          </form>
          {list.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : list.isError || !list.data ? (
            <LoadFailed error={list.error} what="the accounts" onRetry={() => void list.refetch()} />
          ) : list.data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No user matches.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Workspaces</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.items.map((row) => (
                  <TableRow key={row.userId} data-state={selected === row.userId ? 'selected' : undefined}>
                    <TableCell>
                      <button type="button" className="text-left hover:underline" aria-pressed={selected === row.userId} onClick={() => setSelected(row.userId)}>
                        <span className="font-medium">{row.name}</span>
                        <span className="block text-xs text-muted-foreground">{row.email}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.planSlug}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.workspaces}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCredits(row.allocatedCredits)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCredits(row.availableCredits)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCredits(row.usedCredits)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {selected && (
        <Card>
          <CardContent className="p-4">
            <Account key={selected} userId={selected} canWrite={canWrite} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
