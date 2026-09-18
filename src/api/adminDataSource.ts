import type { AiConfiguration } from '@/types/ai';
import type { Paginated } from '@/types/api';
import type {
  BillingCharts,
  BillingSummary,
  Invoice,
  InvoiceListParams,
  Payment,
  PaymentListParams,
  Subscription,
  SubscriptionListParams,
  SubscriptionStatus,
} from '@/types/billing';
import type { OrganizationUsageRow } from '@/types/quota';
import type { ChannelDefinition, FeatureDefinition, LimitDefinition } from '@/types/catalog';
import type { EntitlementOverrides, UsageSnapshot } from '@/types/entitlements';
import type {
  Organization,
  OrganizationInput,
  OrganizationListParams,
  OrganizationUser,
  OrganizationUserInput,
  OrganizationUserStatus,
  TenantStatus,
} from '@/types/organization';
import type { Plan, PlanInput } from '@/types/plan';

/**
 * The single contract every admin screen reads and writes through — the same idea as `ormitech-docs`'
 * `DocSource`: the UI is written against this interface, never against a concrete transport.
 *
 * Two implementations exist: `mockDataSource` (in-memory, the default today, clearly labeled as mock data) and
 * `apiDataSource` (real HTTP against ormitech-api). The API endpoints it targets do not exist yet, so the mock
 * stays the default until they do — see `src/mocks/mockDataSource.ts` and `src/api/apiDataSource.ts`.
 */
export interface AdminDataSource {
  readonly id: 'mock' | 'api';

  listFeatures(): Promise<FeatureDefinition[]>;
  listChannels(): Promise<ChannelDefinition[]>;
  listLimits(): Promise<LimitDefinition[]>;

  listPlans(): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | null>;
  createPlan(input: PlanInput): Promise<Plan>;
  updatePlan(id: string, input: PlanInput): Promise<Plan>;

  listOrganizations(params: OrganizationListParams): Promise<Paginated<Organization>>;
  getOrganization(id: string): Promise<Organization | null>;
  createOrganization(input: OrganizationInput): Promise<Organization>;
  updateOrganization(id: string, input: OrganizationInput): Promise<Organization>;
  setOrganizationStatus(id: string, status: TenantStatus): Promise<Organization>;
  assignPlan(id: string, planId: string): Promise<Organization>;
  updateOverrides(id: string, overrides: EntitlementOverrides): Promise<Organization>;
  updateAiConfiguration(id: string, configuration: AiConfiguration): Promise<Organization>;
  getUsage(id: string): Promise<UsageSnapshot>;

  /** Platform-wide usage, one row per organization. */
  listUsage(): Promise<OrganizationUsageRow[]>;

  listSubscriptions(params: SubscriptionListParams): Promise<Paginated<Subscription>>;
  getSubscription(id: string): Promise<Subscription | null>;
  getSubscriptionByOrganization(organizationId: string): Promise<Subscription | null>;
  setSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<Subscription>;

  listPayments(params: PaymentListParams): Promise<Paginated<Payment>>;

  listInvoices(params: InvoiceListParams): Promise<Paginated<Invoice>>;
  voidInvoice(id: string): Promise<Invoice>;

  getBillingSummary(): Promise<BillingSummary>;
  getBillingCharts(): Promise<BillingCharts>;

  listOrganizationUsers(organizationId: string): Promise<OrganizationUser[]>;
  createOrganizationUser(organizationId: string, input: OrganizationUserInput): Promise<OrganizationUser>;
  updateOrganizationUser(organizationId: string, userId: string, input: OrganizationUserInput): Promise<OrganizationUser>;
  setOrganizationUserStatus(organizationId: string, userId: string, status: OrganizationUserStatus): Promise<OrganizationUser>;
}
