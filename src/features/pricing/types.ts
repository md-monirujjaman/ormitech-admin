export interface PricingCurrency {
  id: string;
  label: string;
  symbol: string;
  /** Display price = base price x rate. */
  rate: number;
  /** The display price is rounded to a multiple of this. */
  round: number;
}

/** A missing or null value means "custom": no fixed number. */
export interface PricingLimits {
  conversations?: number | null;
  teamMembers?: number | null;
  socialChannels?: number | null;
}

export interface PricingDiscount {
  percent: number;
  label: string | null;
  endsAt: string | null;
}

export interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  priceLabel: string | null;
  priceNote: string | null;
  popular: boolean;
  cta: { label: string; href: string };
  limits: PricingLimits;
  summary: string;
  featuresIntro: string | null;
  features: string[];
  discount: PricingDiscount | null;
  /** False once the discount's end date has passed. */
  discountActive: boolean;
}

export interface PricingBilling {
  symbol: string;
  annualDiscountPercent: number;
  currencies: PricingCurrency[];
}

export interface PricingConfig {
  billing: PricingBilling;
  plans: PricingPlan[];
  updatedAt: string | null;
}

export interface UpdatePlanInput {
  name?: string;
  tagline?: string;
  monthlyPrice?: number | null;
  priceLabel?: string | null;
  priceNote?: string | null;
  ctaLabel?: string;
  ctaHref?: string;
  popular?: boolean;
  summary?: string;
  featuresIntro?: string | null;
  features?: string[];
  limits?: PricingLimits;
  discountPercent?: number;
  discountLabel?: string | null;
  discountEndsAt?: string | null;
}

export interface UpdateSettingsInput {
  currencySymbol?: string;
  annualDiscountPercent?: number;
  currencies?: PricingCurrency[];
}
