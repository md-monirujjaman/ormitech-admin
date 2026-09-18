import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { InvoiceStatus, PaymentStatus, SubscriptionStatus } from '@/types/billing';
import type { ChannelConnectionStatus } from '@/types/catalog';
import type { OrganizationUserStatus, TenantStatus } from '@/types/organization';
import type { PlanStatus } from '@/types/plan';
import type { QuotaStatusLevel } from '@/types/quota';

const TENANT_VARIANT: Record<TenantStatus, BadgeProps['variant']> = {
  ACTIVE: 'success',
  TRIAL: 'default',
  SUSPENDED: 'destructive',
  CANCELLED: 'secondary',
  PENDING: 'warning',
};

const TENANT_LABEL: Record<TenantStatus, string> = {
  ACTIVE: 'Active',
  TRIAL: 'Trial',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
  PENDING: 'Pending',
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return <Badge variant={TENANT_VARIANT[status]}>{TENANT_LABEL[status]}</Badge>;
}

const USER_VARIANT: Record<OrganizationUserStatus, BadgeProps['variant']> = {
  active: 'success',
  invited: 'warning',
  disabled: 'secondary',
};

export function UserStatusBadge({ status }: { status: OrganizationUserStatus }) {
  return <Badge variant={USER_VARIANT[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

const CONNECTION_VARIANT: Record<ChannelConnectionStatus, BadgeProps['variant']> = {
  connected: 'success',
  disconnected: 'secondary',
  error: 'destructive',
  not_configured: 'outline',
};

const CONNECTION_LABEL: Record<ChannelConnectionStatus, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
  not_configured: 'Not configured',
};

export function ConnectionStatusBadge({ status }: { status: ChannelConnectionStatus }) {
  return <Badge variant={CONNECTION_VARIANT[status]}>{CONNECTION_LABEL[status]}</Badge>;
}

const PLAN_VARIANT: Record<PlanStatus, BadgeProps['variant']> = {
  active: 'success',
  draft: 'warning',
  archived: 'secondary',
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <Badge variant={PLAN_VARIANT[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

const SUBSCRIPTION_VARIANT: Record<SubscriptionStatus, BadgeProps['variant']> = {
  TRIAL: 'default',
  ACTIVE: 'success',
  PAST_DUE: 'destructive',
  PAUSED: 'warning',
  CANCELLED: 'secondary',
  EXPIRED: 'outline',
};

const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  TRIAL: 'Trial',
  ACTIVE: 'Active',
  PAST_DUE: 'Past due',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={SUBSCRIPTION_VARIANT[status]}>{SUBSCRIPTION_LABEL[status]}</Badge>;
}

const PAYMENT_VARIANT: Record<PaymentStatus, BadgeProps['variant']> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'destructive',
  REFUNDED: 'secondary',
  CANCELLED: 'outline',
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_VARIANT[status]}>{PAYMENT_LABEL[status]}</Badge>;
}

const INVOICE_VARIANT: Record<InvoiceStatus, BadgeProps['variant']> = {
  DRAFT: 'outline',
  OPEN: 'warning',
  PAID: 'success',
  VOID: 'secondary',
  UNCOLLECTIBLE: 'destructive',
};

const INVOICE_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  PAID: 'Paid',
  VOID: 'Void',
  UNCOLLECTIBLE: 'Uncollectible',
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={INVOICE_VARIANT[status]}>{INVOICE_LABEL[status]}</Badge>;
}

const QUOTA_VARIANT: Record<QuotaStatusLevel, BadgeProps['variant']> = {
  normal: 'secondary',
  warning: 'warning',
  critical: 'destructive',
  exceeded: 'destructive',
};

const QUOTA_LABEL: Record<QuotaStatusLevel, string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  exceeded: 'Exceeded',
};

export function QuotaStatusBadge({ status }: { status: QuotaStatusLevel }) {
  return <Badge variant={QUOTA_VARIANT[status]}>{QUOTA_LABEL[status]}</Badge>;
}
