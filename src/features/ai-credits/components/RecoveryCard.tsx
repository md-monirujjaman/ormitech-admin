import { CircleAlert, CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiErrorMessage } from '@/lib/apiError';
import { formatCredits, formatWhen } from '../format';
import { useConfirmRecovery, useRunRecovery } from '../hooks';
import type { RecoveryResult, RecoveryStatus } from '../types';

function ResultSummary({ result }: { result: RecoveryResult }) {
  const left = result.remaining.total;
  return (
    <div className="space-y-2 text-sm" data-testid="recovery-result">
      <p className={`flex items-center gap-2 font-medium ${left === 0 && result.failedOrganizations === 0 ? 'text-success' : 'text-destructive'}`}>
        {left === 0 && result.failedOrganizations === 0 ? <CircleCheck className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}
        {left === 0 && result.failedOrganizations === 0 ? 'Nothing is left unfinished' : `${left} item(s) unfinished, ${result.failedOrganizations} workspace(s) failed`}
      </p>
      <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Workspaces looked at</dt><dd>{result.organizations}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Holds settled from their requests</dt><dd>{result.holdsSettled}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Holds released, nothing charged</dt><dd>{result.holdsReleased}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Requests paid after their hold expired</dt><dd>{result.lateCharges}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Cost snapshots made</dt><dd>{result.snapshotsMade}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Credits charged</dt><dd>{formatCredits(result.creditsCharged)}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Credits that could not be covered</dt><dd>{formatCredits(result.creditsShortfall)}</dd></div>
      </dl>
    </div>
  );
}

/**
 * Crash recovery. A worker that dies after writing an AI request leaves credit held and the request uncharged; recovery finishes
 * that work and never charges a request twice. Enforce mode (platform or workspace) stays unavailable until an administrator
 * confirms it here, which runs recovery and confirms only if nothing is left unfinished and every bucket reconciles.
 */
export function RecoveryCard({ recovery, canWrite }: { recovery: RecoveryStatus; canWrite: boolean }) {
  const run = useRunRecovery();
  const confirm = useConfirmRecovery();
  const [asking, setAsking] = useState(false);
  const result = run.data ?? confirm.data?.result ?? recovery.lastResult;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crash recovery</CardTitle>
        <CardDescription>
          Finishes AI credit work that a crash or restart left half done.
        </CardDescription>
        <div>
          <Badge variant={recovery.enforceAllowed ? 'success' : 'warning'}>{recovery.enforceAllowed ? 'Confirmed: enforce may be used' : 'Not confirmed: enforce is unavailable'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {recovery.scheduled ? 'This deployment runs recovery by itself every minute.' : 'This deployment does not run recovery by itself (AI_CREDIT_RECOVERY_ENABLED is off): run it here.'}{' '}
          {recovery.lastRunAt ? `Last run ${formatWhen(recovery.lastRunAt)}.` : 'It has not run yet.'}
          {recovery.confirmedAt ? ` Confirmed ${formatWhen(recovery.confirmedAt)}.` : ''}
        </p>

        {result && <ResultSummary result={result} />}

        {run.error ? (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(run.error, 'Recovery could not be run.')}
          </p>
        ) : null}

        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={run.isPending || confirm.isPending} onClick={() => run.mutate()}>
              {run.isPending ? 'Running…' : 'Run recovery now'}
            </Button>
            {!recovery.enforceAllowed && (
              <Button
                disabled={run.isPending || confirm.isPending}
                onClick={() => {
                  confirm.reset();
                  setAsking(true);
                }}
              >
                Confirm recovery
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {asking && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || confirm.isPending ? undefined : setAsking(false))}
          title="Confirm that recovery works?"
          description="This runs recovery across every workspace. It is confirmed only if nothing is left unfinished, no workspace fails and every credit bucket matches its ledger. Once confirmed, enforce mode can be switched on."
          confirmLabel="Run and confirm"
          isPending={confirm.isPending}
          onConfirm={() => confirm.mutate(undefined, { onSuccess: () => setAsking(false) })}
        >
          {confirm.error ? (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(confirm.error, 'Recovery could not be confirmed.')}
            </p>
          ) : null}
        </ConfirmDialog>
      )}
    </Card>
  );
}
