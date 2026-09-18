import {
  Activity,
  Bell,
  Blocks,
  Bot,
  BookOpen,
  Building2,
  CreditCard,
  Flag,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  Mail,
  Megaphone,
  MessageSquare,
  Package,
  Plug,
  Radio,
  Receipt,
  ScrollText,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  Webhook,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import type { NavSection } from '@/types/navigation';

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard }],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Organizations', href: ROUTES.organizations, icon: Building2, permission: 'organizations.read' },
      { label: 'Users', href: ROUTES.users, icon: Users, permission: 'users.read' },
      { label: 'Conversations', href: ROUTES.conversations, icon: MessageSquare, permission: 'conversations.read' },
      { label: 'Leads', href: ROUTES.leads, icon: UserPlus, permission: 'leads.read' },
    ],
  },
  {
    label: 'Product',
    items: [
      { label: 'Plans', href: ROUTES.plans, icon: Package, permission: 'plans.read' },
      { label: 'Features', href: ROUTES.features, icon: Sparkles, permission: 'features.read' },
      { label: 'AI Configuration', href: ROUTES.ai, icon: Bot, permission: 'ai.read' },
      { label: 'Channels', href: ROUTES.channels, icon: Radio, permission: 'channels.read' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { label: 'Billing Overview', href: ROUTES.billing, icon: TrendingUp, permission: 'billing.read' },
      { label: 'Subscriptions', href: ROUTES.subscriptions, icon: CreditCard, permission: 'subscriptions.read' },
      { label: 'Payments', href: ROUTES.payments, icon: Wallet, permission: 'payments.read' },
      { label: 'Invoices', href: ROUTES.invoices, icon: Receipt, permission: 'invoices.read' },
      { label: 'Usage', href: ROUTES.usage, icon: Target, permission: 'usage.read' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Documentation', href: ROUTES.docs, icon: BookOpen, permission: 'docs.read' },
      { label: 'Announcements', href: ROUTES.announcements, icon: Megaphone, permission: 'announcements.read' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'API', href: ROUTES.api, icon: Plug, permission: 'api.read' },
      { label: 'Webhooks', href: ROUTES.webhooks, icon: Webhook, permission: 'webhooks.read' },
      { label: 'Integrations', href: ROUTES.integrations, icon: Blocks, permission: 'integrations.read' },
      { label: 'System Health', href: ROUTES.systemHealth, icon: Activity, permission: 'system.read' },
      { label: 'Jobs / Queues', href: ROUTES.jobs, icon: ListTodo, permission: 'jobs.read' },
    ],
  },
  {
    label: 'Security',
    items: [
      { label: 'Admin Users', href: ROUTES.adminUsers, icon: UserCog, permission: 'admin_users.read' },
      { label: 'Roles & Permissions', href: ROUTES.roles, icon: KeyRound, permission: 'roles.read' },
      { label: 'Audit Logs', href: ROUTES.auditLogs, icon: ScrollText, permission: 'audit.read' },
      { label: 'Security Events', href: ROUTES.securityEvents, icon: ShieldAlert, permission: 'security.read' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Platform Settings', href: ROUTES.settings, icon: Settings, permission: 'settings.read' },
      { label: 'Email', href: ROUTES.email, icon: Mail, permission: 'email.read' },
      { label: 'Notifications', href: ROUTES.notifications, icon: Bell, permission: 'notifications.read' },
      { label: 'Feature Flags', href: ROUTES.featureFlags, icon: Flag, permission: 'feature_flags.read' },
    ],
  },
  {
    label: 'Support',
    items: [{ label: 'Support Tickets', href: ROUTES.support, icon: LifeBuoy, permission: 'support.read' }],
  },
];

/**
 * Looks up the current page's title and section label for the topbar's title/breadcrumb, from the same data the
 * sidebar renders. Nested routes (`/organizations/org_123`) resolve to their parent nav item, so a detail page
 * still shows where it sits.
 */
export function findNavMeta(pathname: string): { title: string; section: string | null } {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return { title: item.label, section: section.label === 'Overview' ? null : section.label };
      }
    }
  }
  return { title: 'OrmiTech Admin', section: null };
}
