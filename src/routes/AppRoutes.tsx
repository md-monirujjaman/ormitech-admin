import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { LoadingState } from '@/components/ui/LoadingState';
import AdminForgotPassword from '@/features/auth/pages/AdminForgotPassword';
import AdminLogin from '@/features/auth/pages/AdminLogin';
import { ROUTES } from '@/lib/constants';
import { NAV_SECTIONS } from '@/lib/navigation';
import NotFound from '@/pages/NotFound';
import { AdminRoute } from '@/routes/AdminRoute';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

// Route-level code splitting: the login screen shouldn't pay for Recharts, tables or the entitlement editors.
const Overview = lazy(() => import('@/pages/Overview'));
const ServerHealth = lazy(() => import('@/pages/ServerHealth'));
const OrganizationsPage = lazy(() => import('@/features/organizations/pages/OrganizationsPage'));
const OrganizationDetailPage = lazy(() => import('@/features/organizations/pages/OrganizationDetailPage'));
const PlansPage = lazy(() => import('@/features/plans/pages/PlansPage'));
const FeaturesPage = lazy(() => import('@/features/features/pages/FeaturesPage'));
const ChannelsPage = lazy(() => import('@/features/channels/pages/ChannelsPage'));
const AiPage = lazy(() => import('@/features/ai/pages/AiPage'));
const BillingOverviewPage = lazy(() => import('@/features/billing/pages/BillingOverviewPage'));
const SubscriptionsPage = lazy(() => import('@/features/subscriptions/pages/SubscriptionsPage'));
const PaymentsPage = lazy(() => import('@/features/payments/pages/PaymentsPage'));
const InvoicesPage = lazy(() => import('@/features/invoices/pages/InvoicesPage'));
const UsagePage = lazy(() => import('@/features/usage/pages/UsagePage'));

/** Routes with a real page — everything else in NAV_SECTIONS renders <ComingSoon> instead. */
const IMPLEMENTED_ROUTES = new Set<string>([
  ROUTES.dashboard,
  ROUTES.systemHealth,
  ROUTES.organizations,
  ROUTES.plans,
  ROUTES.features,
  ROUTES.channels,
  ROUTES.ai,
  ROUTES.billing,
  ROUTES.subscriptions,
  ROUTES.payments,
  ROUTES.invoices,
  ROUTES.usage,
]);

const comingSoonItems = NAV_SECTIONS.flatMap((section) => section.items).filter((item) => !IMPLEMENTED_ROUTES.has(item.href));

function Lazy({ label, children }: { label: string; children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState label={label} />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<AdminLogin />} />
      <Route path={ROUTES.forgotPassword} element={<AdminForgotPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to={ROUTES.dashboard} replace />} />

          <Route
            path={ROUTES.dashboard}
            element={
              <Lazy label="Loading dashboard…">
                <Overview />
              </Lazy>
            }
          />

          <Route
            path={ROUTES.organizations}
            element={
              <AdminRoute permission="organizations.read">
                <Lazy label="Loading organizations…">
                  <OrganizationsPage />
                </Lazy>
              </AdminRoute>
            }
          />
          <Route
            path={`${ROUTES.organizations}/:organizationId`}
            element={
              <AdminRoute permission="organizations.read">
                <Lazy label="Loading organization…">
                  <OrganizationDetailPage />
                </Lazy>
              </AdminRoute>
            }
          />

          <Route
            path={ROUTES.plans}
            element={
              <AdminRoute permission="plans.read">
                <Lazy label="Loading plans…">
                  <PlansPage />
                </Lazy>
              </AdminRoute>
            }
          />

          <Route
            path={ROUTES.features}
            element={
              <AdminRoute permission="features.read">
                <Lazy label="Loading features…">
                  <FeaturesPage />
                </Lazy>
              </AdminRoute>
            }
          />

          <Route
            path={ROUTES.channels}
            element={
              <AdminRoute permission="channels.read">
                <Lazy label="Loading channels…">
                  <ChannelsPage />
                </Lazy>
              </AdminRoute>
            }
          />

          <Route
            path={ROUTES.ai}
            element={
              <AdminRoute permission="ai.read">
                <Lazy label="Loading AI configuration…">
                  <AiPage />
                </Lazy>
              </AdminRoute>
            }
          />

          <Route
            path={ROUTES.billing}
            element={
              <AdminRoute permission="billing.read">
                <Lazy label="Loading billing overview…">
                  <BillingOverviewPage />
                </Lazy>
              </AdminRoute>
            }
          />

          <Route
            path={ROUTES.subscriptions}
            element={
              <AdminRoute permission="subscriptions.read">
                <Lazy label="Loading subscriptions…">
                  <SubscriptionsPage />
                </Lazy>
              </AdminRoute>
            }
          />

          <Route
            path={ROUTES.payments}
            element={
              <AdminRoute permission="payments.read">
                <Lazy label="Loading payments…">
                  <PaymentsPage />
                </Lazy>
              </AdminRoute>
            }
          />

          <Route
            path={ROUTES.invoices}
            element={
              <AdminRoute permission="invoices.read">
                <Lazy label="Loading invoices…">
                  <InvoicesPage />
                </Lazy>
              </AdminRoute>
            }
          />

          <Route
            path={ROUTES.usage}
            element={
              <AdminRoute permission="usage.read">
                <Lazy label="Loading usage…">
                  <UsagePage />
                </Lazy>
              </AdminRoute>
            }
          />

          <Route
            path={ROUTES.systemHealth}
            element={
              <AdminRoute permission="system.read">
                <Lazy label="Loading system health…">
                  <ServerHealth />
                </Lazy>
              </AdminRoute>
            }
          />

          {comingSoonItems.map((item) => (
            <Route
              key={item.href}
              path={item.href}
              element={
                <AdminRoute permission={item.permission}>
                  <ComingSoon title={item.label} icon={item.icon} />
                </AdminRoute>
              }
            />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
