import { Coins, Plug } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { isMockDataSource } from '@/api/dataSource';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { AccountsTab } from '../components/AccountsTab';
import { DashboardTab } from '../components/DashboardTab';
import { FilterBar } from '../components/FilterBar';
import { LimitsTab } from '../components/LimitsTab';
import { OperationsTab } from '../components/OperationsTab';
import { PlansTab } from '../components/PlansTab';
import { SettingsTab } from '../components/SettingsTab';
import { defaultPeriod, periodToFilters, type FilterDraft } from '../period';
import type { Filters } from '../types';

type TabName = 'accounts' | 'dashboard' | 'operations' | 'plans' | 'settings' | 'limits';

const blankDraft = (): FilterDraft => ({ ...defaultPeriod(), organizationId: '', kind: '', model: '', status: '' });

/**
 * The credit system for super admins: the financial settings and the pilot allowlist, the workspace budget and spending limits, a dashboard
 * of what AI costs and what the wallets hold, and an operational view of every request's reservation, settlement and reconciliation.
 * The API enforces who may do what; this page hides what it would refuse. Nothing is shown from mock data, and a figure that cannot be
 * known is shown as "Not available", never as zero.
 */
export default function CreditSystemPage() {
  const { can } = usePermissions();
  const canWrite = can('ai_credits.write');
  const [tab, setTab] = useState<TabName>('accounts');
  const [pending, setPending] = useState<TabName | null>(null);
  const [draft, setDraft] = useState<FilterDraft>(blankDraft);
  const [filters, setFilters] = useState<Filters>(() => periodToFilters(draft));
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  const onDirtyChange = useCallback((source: string, value: boolean) => setDirty((current) => (current[source] === value ? current : { ...current, [source]: value })), []);
  const unsaved = Object.values(dirty).some(Boolean);

  // Closing or reloading the tab with unsaved settings asks first. (Links inside the admin cannot be intercepted: this router has no blocker.)
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const change = (next: string) => {
    if (next === tab) return;
    if (unsaved) setPending(next as TabName);
    else setTab(next as TabName);
  };

  if (isMockDataSource) {
    return (
      <div className="space-y-6">
        <PageHeader title="Credit system" description="Financial settings, limits, dashboard and operations." showMockNotice={false} />
        <EmptyState icon={Plug} title="This page needs the live API" description="The credit system holds real platform finance, so nothing is shown from mock data. Set VITE_ADMIN_DATA_SOURCE=api and sign in to a real super admin account." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit system"
        description="Each user’s credit wallet and plan, what the AI cost, and the rules behind it. Credit mode is off unless you change it on the Settings tab. Every change is recorded in the audit log."
        showMockNotice={false}
        actions={<Coins className="size-5 text-muted-foreground" aria-hidden />}
      />

      <Tabs value={tab} onValueChange={change}>
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="plans">Plans & budgets</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="limits">Workspace limits</TabsTrigger>
        </TabsList>

        {(tab === 'dashboard' || tab === 'operations') && (
          <div className="mt-4">
            <FilterBar
              key={JSON.stringify(draft)}
              initial={draft}
              onApply={(next, nextDraft) => {
                setFilters(next);
                setDraft(nextDraft);
              }}
            />
          </div>
        )}
        <TabsContent value="accounts" className="mt-4">
          <AccountsTab canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="dashboard" className="mt-4">
          <DashboardTab filters={filters} />
        </TabsContent>
        <TabsContent value="operations" className="mt-4">
          <OperationsTab filters={filters} />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          <PlansTab canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsTab canWrite={canWrite} onDirtyChange={onDirtyChange} />
        </TabsContent>
        <TabsContent value="limits" className="mt-4">
          <LimitsTab canWrite={canWrite} />
        </TabsContent>
      </Tabs>

      {pending && (
        <ConfirmDialog
          open
          onOpenChange={(open) => (open ? undefined : setPending(null))}
          title="Leave with unsaved changes?"
          description="Something on the Settings tab was changed and not saved. Leaving the tab discards it."
          confirmLabel="Discard and leave"
          cancelLabel="Stay"
          destructive
          onConfirm={() => {
            setDirty({});
            setTab(pending);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
