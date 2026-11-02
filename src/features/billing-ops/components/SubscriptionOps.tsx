import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePlans } from '@/features/plans/hooks';
import { apiErrorMessage } from '@/lib/apiError';
import { useAllocateCredits, useChangeSubscriptionPlan } from '../hooks';

/**
 * Two billing acts on a subscription, each with a stated reason and an audit record:
 *  - grant the plan's included AI credits for the current period (once; the same period again moves nothing), and
 *  - move the subscription to another plan. This changes the subscription only. It does not change the plan the workspace
 *    actually uses, which stays as it is until it is changed on the organization, and it creates no invoice.
 */
export function SubscriptionOps({ subscriptionId, currentPlanId }: { subscriptionId: string; currentPlanId: string }) {
  const [asking, setAsking] = useState<'allocate' | 'plan' | null>(null);
  const [reason, setReason] = useState('');
  const [planId, setPlanId] = useState('');
  const [notice, setNotice] = useState('');
  const allocate = useAllocateCredits(subscriptionId);
  const change = useChangeSubscriptionPlan(subscriptionId);
  const plans = usePlans();
  const active = (plans.data ?? []).filter((plan) => plan.status === 'active' && plan.id !== currentPlanId);

  const close = () => {
    setAsking(null);
    setReason('');
    setPlanId('');
    allocate.reset();
    change.reset();
  };
  const short = reason.trim().length < 3;

  return (
    <section aria-label="Billing actions" className="space-y-2 rounded-lg border border-border p-4">
      <p className="text-sm font-semibold text-foreground">Billing actions</p>
      {notice && <p role="status" className="text-xs text-success">{notice}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => { setNotice(''); setAsking('allocate'); }}>Grant plan credits</Button>
        <Button size="sm" variant="outline" onClick={() => { setNotice(''); setAsking('plan'); }}>Change plan</Button>
      </div>

      {asking === 'allocate' && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || allocate.isPending ? undefined : close())}
          title="Grant this period's plan credits?"
          description="Adds the plan's included AI credits to the workspace's wallet for the current period, once. Asking again for the same period moves nothing."
          confirmLabel="Grant credits"
          isPending={allocate.isPending}
          onConfirm={() => {
            if (short) return;
            allocate.mutate(reason.trim(), { onSuccess: (result) => { setNotice(result.replay ? 'This period was already granted: nothing moved.' : `${result.credits} credits granted.`); close(); } });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="allocate-reason">Reason</Label>
            <Textarea id="allocate-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            {allocate.error ? <p role="alert" className="text-xs text-destructive">{apiErrorMessage(allocate.error, 'The credits could not be granted.')}</p> : null}
          </div>
        </ConfirmDialog>
      )}

      {asking === 'plan' && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open || change.isPending ? undefined : close())}
          title="Move this subscription to another plan?"
          description="Changes the subscription only. The plan the workspace uses is not changed here, and no invoice is made."
          confirmLabel="Change plan"
          isPending={change.isPending}
          onConfirm={() => {
            if (short || !planId) return;
            change.mutate({ planId, reason: reason.trim() }, { onSuccess: (result) => { setNotice(result.planMatchesOrganization ? 'The subscription plan was changed.' : `The subscription is now on ${result.planName}; the workspace still uses ${result.organizationPlan}.`); close(); } });
          }}
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-target">New plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger id="plan-target" aria-label="New plan"><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>{active.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-reason">Reason</Label>
              <Textarea id="plan-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
            {change.error ? <p role="alert" className="text-xs text-destructive">{apiErrorMessage(change.error, 'The plan could not be changed.')}</p> : null}
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}
