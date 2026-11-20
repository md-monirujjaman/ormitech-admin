import { CheckCircle2, CircleAlert, Plug, TriangleAlert, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { isMockDataSource } from '@/api/dataSource';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { CreditPolicyTab } from '@/features/ai-credits/components/CreditPolicyTab';
import { ModelsTab } from '../components/ModelsTab';
import { ConnectionTab } from '../components/ConnectionTab';
import { InstructionsTab } from '../components/InstructionsTab';
import { RoutingTab } from '../components/RoutingTab';
import type { NoticeTone } from '../components/notice';

const TONE_STYLE: Record<NoticeTone, { box: string; icon: typeof CheckCircle2 }> = {
  success: { box: 'border-success/40 bg-success/10 text-foreground', icon: CheckCircle2 },
  warning: { box: 'border-warning/40 bg-warning/10 text-foreground', icon: TriangleAlert },
  error: { box: 'border-destructive/40 bg-destructive/10 text-foreground', icon: CircleAlert },
};

/**
 * The AI gateway: its connection, the models, their prices and which model does what. Super admins only: the API enforces it,
 * and this page only hides what it would refuse. Nothing is shown from mock data: with the mock data source it asks for
 * the live API instead of inventing models.
 */
export default function AiProvidersPage() {
  const { can } = usePermissions();
  const canWrite = can('ai_providers.write');
  const canReadCredits = can('ai_credits.read');
  const canWriteCredits = can('ai_credits.write');
  const [notice, setNotice] = useState<{ message: string; tone: NoticeTone } | null>(null);

  const notify = useCallback((message: string, tone: NoticeTone = 'success') => setNotice({ message, tone }), []);
  // A success message goes away on its own; a warning or an error stays until it is dismissed.
  useEffect(() => {
    if (notice?.tone !== 'success') return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (isMockDataSource) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI gateway & models" description="The OpenRouter connection, models, prices and routing." showMockNotice={false} />
        <EmptyState
          icon={Plug}
          title="This page needs the live API"
          description="The gateway and its models are real platform configuration, so nothing is shown from mock data. Set VITE_ADMIN_DATA_SOURCE=api and sign in to a real super admin account."
        />
      </div>
    );
  }

  const Icon = notice ? TONE_STYLE[notice.tone].icon : CheckCircle2;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI gateway & models"
        description="Every AI request goes to OpenRouter through one key set on the server. Choose which models answer, what they cost, how replies are routed and what instructions they follow. Every workspace is answered by these models. Every change is recorded in the audit log."
        showMockNotice={false}
      />

      {notice && (
        <div role={notice.tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-md border p-3 text-sm ${TONE_STYLE[notice.tone].box}`}>
          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="flex-1">{notice.message}</p>
          <button type="button" aria-label="Dismiss" className="text-muted-foreground hover:text-foreground" onClick={() => setNotice(null)}>
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <Tabs defaultValue="connection">
        <TabsList>
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="models">Models & pricing</TabsTrigger>
          <TabsTrigger value="routing">Routing</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          {canReadCredits && <TabsTrigger value="credits">Credit policy</TabsTrigger>}
        </TabsList>
        <TabsContent value="connection" className="pt-4">
          <ConnectionTab canWrite={canWrite} notify={notify} />
        </TabsContent>
        <TabsContent value="models" className="pt-4">
          <ModelsTab canWrite={canWrite} notify={notify} />
        </TabsContent>
        <TabsContent value="routing" className="pt-4">
          <RoutingTab canWrite={canWrite} notify={notify} />
        </TabsContent>
        <TabsContent value="instructions" className="pt-4">
          <InstructionsTab canWrite={canWrite} notify={notify} />
        </TabsContent>
        {canReadCredits && (
          <TabsContent value="credits" className="pt-4">
            <CreditPolicyTab canWrite={canWriteCredits} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
