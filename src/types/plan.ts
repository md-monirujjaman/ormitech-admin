import type { ChannelKey, FeatureKey, LimitKey, LimitValue } from './entitlements';

export type BillingInterval = 'monthly' | 'yearly';
export type PlanStatus = 'active' | 'draft' | 'archived';

/**
 * A SaaS package. Plans are data — the admin defines them; nothing in the UI assumes a particular set of plans
 * exists, so "Starter/Professional/Business/Enterprise" is seed data, not a type.
 */
export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  status: PlanStatus;

  features: Record<FeatureKey, boolean>;
  channels: Record<ChannelKey, boolean>;
  limits: Record<LimitKey, LimitValue>;

  /** Enterprise-style plan whose entitlements are expected to be tailored per organization via overrides. */
  custom: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface PlanInput {
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  status: PlanStatus;
  custom: boolean;
  features: Record<FeatureKey, boolean>;
  channels: Record<ChannelKey, boolean>;
  limits: Record<LimitKey, LimitValue>;
}
