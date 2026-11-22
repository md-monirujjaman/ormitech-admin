import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { BrandingTab } from '../components/BrandingTab';
import { DeliveryTab } from '../components/DeliveryTab';
import { TemplatesTab } from '../components/TemplatesTab';

const TABS = ['templates', 'branding', 'delivery'] as const;
type Tab = (typeof TABS)[number];

/**
 * Email Management (Settings → Email): the platform's email templates, the look they share, and a log of what was delivered. All of it is
 * the ormitech-api `/admin/email` service, which only super admins may use; this screen hides what a role cannot do and the API refuses it.
 */
export default function EmailPage() {
  const { can } = usePermissions();
  const canWrite = can('email.write');
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = (TABS as readonly string[]).includes(requested ?? '') ? (requested as Tab) : 'templates';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email"
        description="Write and preview the emails customers receive, set how they look, and see what was delivered."
        showMockNotice={false}
      />
      <Tabs value={tab} onValueChange={(value) => setParams(value === 'templates' ? {} : { tab: value }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="pt-4">
          <TemplatesTab canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="branding" className="pt-4">
          <BrandingTab canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="delivery" className="pt-4">
          <DeliveryTab canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
