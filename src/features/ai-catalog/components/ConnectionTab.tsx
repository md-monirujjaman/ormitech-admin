import { CheckCircle2, KeyRound, Plug, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/apiError';
import { describeCheckError } from '../format';
import { useAiGateway, useCheckGateway } from '../hooks';
import { GatewayBadge } from './StatusBadges';
import { LoadFailed } from './LoadFailed';
import type { Notify } from './notice';

/**
 * The AI gateway: every AI request goes to OpenRouter through one key and one address, both set in the server environment
 * (Coolify). They cannot be read or changed here, which is on purpose: the key never passes through a browser or the database.
 * This tab says whether they are set, and tests the connection.
 */
export function ConnectionTab({ canWrite, notify }: { canWrite: boolean; notify: Notify }) {
  const query = useAiGateway();
  const check = useCheckGateway();

  if (query.isError) return <LoadFailed error={query.error} what="the AI gateway" onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data) return <Skeleton className="h-48 w-full" />;
  const gateway = query.data;
  const last = check.data?.check ?? null;

  const test = () =>
    check.mutate(undefined, {
      onSuccess: ({ check: result }) => {
        if (result.status === 'healthy') notify('OpenRouter accepted the key.', 'success');
        else notify(describeCheckError(result.error) ?? 'The connection test failed.', 'error');
      },
      onError: (error) => notify(apiErrorMessage(error, 'The connection could not be tested.'), 'error'),
    });

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Plug className="size-5 text-muted-foreground" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">OpenRouter connection</h2>
          {gateway.configured ? <Badge variant="success">Key set</Badge> : <Badge variant="destructive">No key set: the AI is off</Badge>}
          <GatewayBadge status={last ? last.status : gateway.configured ? 'unchecked' : 'no_key'} />
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Address (OPENROUTER_BASE_URL)</dt>
            <dd className="font-mono text-foreground">{gateway.baseUrl}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Key (OPENROUTER_API_KEY)</dt>
            <dd className="flex items-center gap-2 font-mono text-foreground">
              <KeyRound className="size-4 text-muted-foreground" aria-hidden />
              {gateway.keyMask ?? 'not set'}
            </dd>
          </div>
        </dl>

        {last && last.status !== 'healthy' && (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {describeCheckError(last.error) ?? 'The connection test failed.'}
          </p>
        )}
        {last?.status === 'healthy' && (
          <p role="status" className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            OpenRouter accepted the key just now.
          </p>
        )}

        {canWrite && (
          <div>
            <Button size="sm" variant="outline" disabled={check.isPending || !gateway.configured} onClick={test}>
              {check.isPending ? 'Testing…' : 'Test connection'}
            </Button>
          </div>
        )}
      </Card>

      <Card className="space-y-2 p-4 text-sm text-muted-foreground">
        <p>
          The key and the address are server settings. Change them in the deployment environment (Coolify), then redeploy; they are never stored in the database, never shown in full and never sent to a browser.
          Only the last four characters of the key are shown, so you can tell which key is in use.
        </p>
        <p>Which models answer is set in the other tabs: add and price models in “Models &amp; pricing”, then choose the router and Models 1 to 4 in “Routing”. Every workspace is answered by these models; a workspace chooses nothing.</p>
        <p>Set a monthly spend limit on the key in the OpenRouter dashboard: it is the last guard against a runaway bill.</p>
      </Card>
    </div>
  );
}
