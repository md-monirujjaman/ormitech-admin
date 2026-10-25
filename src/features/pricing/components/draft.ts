import { summaryFromLimits } from '../pricingMath';
import type { PricingPlan, UpdatePlanInput } from '../types';

/**
 * What the form holds while a card is being edited: numbers as text (so a box can be empty), the end date as a
 * calendar day. Turned into the API's shape on save, and into a plan for the preview as it is typed.
 */
export interface PlanDraft {
  name: string;
  tagline: string;
  popular: boolean;
  priceMode: 'fixed' | 'custom';
  monthlyPrice: string;
  priceLabel: string;
  priceNote: string;
  ctaLabel: string;
  ctaHref: string;
  summary: string;
  featuresIntro: string;
  features: string[];
  conversations: string;
  teamMembers: string;
  socialChannels: string;
  discountPercent: string;
  discountLabel: string;
  discountEndsAt: string;
}

const dayOf = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const numberText = (value: number | null | undefined): string => (value == null ? '' : String(value));

export function toDraft(plan: PricingPlan): PlanDraft {
  return {
    name: plan.name,
    tagline: plan.tagline,
    popular: plan.popular,
    priceMode: plan.monthlyPrice === null ? 'custom' : 'fixed',
    monthlyPrice: numberText(plan.monthlyPrice),
    priceLabel: plan.priceLabel ?? '',
    priceNote: plan.priceNote ?? '',
    ctaLabel: plan.cta.label,
    ctaHref: plan.cta.href,
    summary: plan.summary,
    featuresIntro: plan.featuresIntro ?? '',
    features: [...plan.features],
    conversations: numberText(plan.limits.conversations),
    teamMembers: numberText(plan.limits.teamMembers),
    socialChannels: numberText(plan.limits.socialChannels),
    discountPercent: plan.discount ? String(plan.discount.percent) : '0',
    discountLabel: plan.discount?.label ?? '',
    discountEndsAt: dayOf(plan.discount?.endsAt),
  };
}

const parse = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
};

/** The end of the chosen day, local time, so "ends Nov 5" means the whole of Nov 5. */
const endOfDay = (day: string): string | null => {
  if (!day) return null;
  const date = new Date(`${day}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** A plan, as the preview card draws it, from what is in the form. */
export function draftToPlan(draft: PlanDraft, id: string): PricingPlan {
  const percent = parse(draft.discountPercent) ?? 0;
  const price = draft.priceMode === 'fixed' ? parse(draft.monthlyPrice) ?? 0 : null;
  return {
    id,
    name: draft.name,
    tagline: draft.tagline,
    monthlyPrice: price,
    priceLabel: draft.priceMode === 'custom' ? draft.priceLabel : null,
    priceNote: draft.priceMode === 'custom' ? draft.priceNote || null : null,
    popular: draft.popular,
    cta: { label: draft.ctaLabel, href: draft.ctaHref },
    limits: { conversations: parse(draft.conversations), teamMembers: parse(draft.teamMembers), socialChannels: parse(draft.socialChannels) },
    summary: draft.summary,
    featuresIntro: draft.featuresIntro || null,
    features: draft.features.map((feature) => feature.trim()).filter(Boolean),
    discount: percent > 0 ? { percent, label: draft.discountLabel.trim() || null, endsAt: endOfDay(draft.discountEndsAt) } : null,
    discountActive: percent > 0,
  };
}

export const suggestedSummary = (draft: PlanDraft): string =>
  summaryFromLimits({ conversations: parse(draft.conversations), teamMembers: parse(draft.teamMembers) });

/** What to send: only what differs from the saved card. Empty when nothing changed. */
export function changesFrom(saved: PricingPlan, draft: PlanDraft): UpdatePlanInput {
  const next = draftToPlan(draft, saved.id);
  const changes: UpdatePlanInput = {};
  if (next.name.trim() !== saved.name) changes.name = next.name.trim();
  if (next.tagline.trim() !== saved.tagline) changes.tagline = next.tagline.trim();
  if (next.monthlyPrice !== saved.monthlyPrice) changes.monthlyPrice = next.monthlyPrice;
  if ((next.priceLabel ?? '').trim() !== (saved.priceLabel ?? '')) changes.priceLabel = next.priceLabel?.trim() || null;
  if ((next.priceNote ?? '').trim() !== (saved.priceNote ?? '')) changes.priceNote = next.priceNote?.trim() || null;
  if (next.cta.label.trim() !== saved.cta.label) changes.ctaLabel = next.cta.label.trim();
  if (next.cta.href.trim() !== saved.cta.href) changes.ctaHref = next.cta.href.trim();
  if (next.popular !== saved.popular) changes.popular = next.popular;
  if (next.summary.trim() !== saved.summary) changes.summary = next.summary.trim();
  if ((next.featuresIntro ?? '').trim() !== (saved.featuresIntro ?? '')) changes.featuresIntro = next.featuresIntro?.trim() || null;
  if (JSON.stringify(next.features) !== JSON.stringify(saved.features)) changes.features = next.features;
  const limitKeys = ['conversations', 'teamMembers', 'socialChannels'] as const;
  if (limitKeys.some((key) => (next.limits[key] ?? null) !== (saved.limits[key] ?? null))) {
    changes.limits = { conversations: next.limits.conversations ?? null, teamMembers: next.limits.teamMembers ?? null, socialChannels: next.limits.socialChannels ?? null };
  }
  const savedPercent = saved.discount?.percent ?? 0;
  const nextPercent = next.discount?.percent ?? 0;
  if (nextPercent !== savedPercent) changes.discountPercent = nextPercent;
  if ((next.discount?.label ?? null) !== (saved.discount?.label ?? null)) changes.discountLabel = next.discount?.label ?? null;
  if (dayOf(next.discount?.endsAt) !== dayOf(saved.discount?.endsAt)) changes.discountEndsAt = next.discount?.endsAt ?? null;
  return changes;
}
