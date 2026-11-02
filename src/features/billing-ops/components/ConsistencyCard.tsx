import { CircleAlert, CircleCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/apiError';
import { useConsistency } from '../hooks';

/** Where billing records disagree with each other or with the plan a workspace actually uses. Read only: nothing is repaired from here. */
export function ConsistencyCard() {
  const query = useConsistency();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing consistency</CardTitle>
        <CardDescription>Subscriptions whose plan differs from the plan the workspace uses, and invoices whose payments do not add up.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {query.isError ? (
          <p role="alert" className="text-destructive">{apiErrorMessage(query.error, 'The check could not be run.')}</p>
        ) : query.isLoading || !query.data ? (
          <Skeleton className="h-10 w-full" />
        ) : query.data.planMismatches.length === 0 && query.data.unbalancedInvoices.length === 0 ? (
          <p className="flex items-center gap-2 font-medium text-success"><CircleCheck className="size-4" aria-hidden /> Everything agrees</p>
        ) : (
          <div role="alert" className="space-y-2">
            {query.data.planMismatches.length > 0 && (
              <div>
                <p className="flex items-center gap-2 font-medium text-destructive"><CircleAlert className="size-4" aria-hidden /> {query.data.planMismatches.length} subscription(s) on a different plan than the workspace uses</p>
                <ul className="mt-1 font-mono text-xs">
                  {query.data.planMismatches.map((row) => (
                    <li key={row.organizationId}>{row.organizationId.slice(0, 8)} · workspace {row.organizationPlan} · subscription {row.subscriptionPlan} ({row.subscriptionStatus})</li>
                  ))}
                </ul>
              </div>
            )}
            {query.data.unbalancedInvoices.length > 0 && (
              <div>
                <p className="flex items-center gap-2 font-medium text-destructive"><CircleAlert className="size-4" aria-hidden /> {query.data.unbalancedInvoices.length} invoice(s) whose payments do not match</p>
                <ul className="mt-1 font-mono text-xs">
                  {query.data.unbalancedInvoices.map((row) => (
                    <li key={row.invoiceId}>{row.number} · {row.status} · total {row.total}, paid {row.paid}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {query.data && <p className="text-xs text-muted-foreground">{query.data.workspacesWithoutSubscription} workspace(s) have no subscription yet.</p>}
      </CardContent>
    </Card>
  );
}
