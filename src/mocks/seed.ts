import type { AiConfiguration } from '@/types/ai';
import type { ChannelDefinition, FeatureDefinition, LimitDefinition } from '@/types/catalog';
import type { ChannelKey, EntitlementOverrides, FeatureKey, LimitKey, LimitValue, UsageSnapshot } from '@/types/entitlements';
import type { Organization, OrganizationUser, OrganizationUserRole, TenantStatus } from '@/types/organization';
import type { Plan } from '@/types/plan';

/**
 * SEED DATA FOR THE MOCK DATA SOURCE — none of this is real.
 *
 * These are hand-written fixtures so the Admin's flows (search, filter, plan assignment, entitlement overrides,
 * status changes) are exercisable before ormitech-api exists. They are never presented as production data: the
 * UI badges every screen backed by this as "Mock data", and `VITE_ADMIN_DATA_SOURCE=api` switches the whole app
 * to real endpoints without touching a component.
 */

const now = '2026-09-18T09:00:00Z';

export const FEATURE_CATALOG: FeatureDefinition[] = [
  { key: 'website_chat', name: 'Website Chat', description: 'Embeddable chat widget for the customer’s own website.', category: 'channels' },
  { key: 'facebook', name: 'Facebook', description: 'Connect a Facebook Page for Messenger conversations.', category: 'channels' },
  { key: 'messenger', name: 'Messenger Inbox', description: 'Unified Messenger inbox for connected Facebook Pages.', category: 'channels', dependsOn: ['facebook'] },
  { key: 'instagram', name: 'Instagram', description: 'Instagram Direct conversations for a connected professional account.', category: 'channels' },
  { key: 'whatsapp', name: 'WhatsApp', description: 'WhatsApp Business conversations.', category: 'channels' },
  { key: 'ai_bot', name: 'AI Bot', description: 'Automated AI replies across enabled channels.', category: 'ai' },
  { key: 'advanced_ai', name: 'Advanced AI', description: 'Custom prompts, knowledge sources and model selection.', category: 'ai', dependsOn: ['ai_bot'] },
  { key: 'human_handover', name: 'Human Handover', description: 'Escalate an AI conversation to a human agent.', category: 'ai' },
  { key: 'lead_generation', name: 'Lead Generation', description: 'Capture and qualify leads from conversations.', category: 'engagement' },
  { key: 'order_management', name: 'Order Management', description: 'Take and track orders inside conversations.', category: 'engagement' },
  { key: 'analytics', name: 'Analytics', description: 'Conversation, lead and agent performance reporting.', category: 'platform' },
  { key: 'api_access', name: 'API Access', description: 'Programmatic access to the OrmiTech API.', category: 'platform' },
  { key: 'custom_branding', name: 'Custom Branding', description: 'Replace OrmiTech branding in the chat widget.', category: 'branding' },
];

export const CHANNEL_CATALOG: ChannelDefinition[] = [
  { key: 'website_chat', name: 'Website Chat', description: 'Chat widget embedded on the customer’s website.', featureKey: 'website_chat', availability: 'available' },
  { key: 'facebook', name: 'Facebook Messenger', description: 'Messenger conversations for a connected Page.', featureKey: 'facebook', availability: 'available' },
  { key: 'instagram', name: 'Instagram', description: 'Instagram Direct conversations.', featureKey: 'instagram', availability: 'available' },
  { key: 'whatsapp', name: 'WhatsApp', description: 'WhatsApp Business conversations.', featureKey: 'whatsapp', availability: 'available' },
];

export const LIMIT_CATALOG: LimitDefinition[] = [
  { key: 'monthly_messages', name: 'Monthly Messages', description: 'Messages processed across all channels.', unit: 'messages', period: 'month' },
  { key: 'ai_conversations', name: 'AI Conversations', description: 'Conversations handled by the AI bot.', unit: 'conversations', period: 'month' },
  { key: 'ai_messages', name: 'AI Messages', description: 'Individual AI-generated messages.', unit: 'messages', period: 'month' },
  { key: 'leads', name: 'Leads', description: 'Leads captured from conversations.', unit: 'leads', period: 'month' },
  { key: 'orders', name: 'Orders', description: 'Orders created from conversations.', unit: 'orders', period: 'month' },
  { key: 'agents', name: 'Agents', description: 'Agent seats that can handle conversations.', unit: 'seats', period: 'total' },
  { key: 'team_members', name: 'Team Members', description: 'Total user accounts in the organization.', unit: 'users', period: 'total' },
  { key: 'connected_channels', name: 'Connected Channels', description: 'Channels that can be connected at once.', unit: 'channels', period: 'total' },
];

const ALL_FEATURE_KEYS = FEATURE_CATALOG.map((feature) => feature.key);
const ALL_CHANNEL_KEYS = CHANNEL_CATALOG.map((channel) => channel.key);

function toggles<T extends string>(all: T[], enabled: T[]): Record<T, boolean> {
  return Object.fromEntries(all.map((key) => [key, enabled.includes(key)])) as Record<T, boolean>;
}

const limited = (value: number): LimitValue => ({ kind: 'limited', value });
const unlimited: LimitValue = { kind: 'unlimited' };
const disabled: LimitValue = { kind: 'disabled' };

function limits(values: Partial<Record<LimitKey, LimitValue>>): Record<LimitKey, LimitValue> {
  return Object.fromEntries(LIMIT_CATALOG.map((definition) => [definition.key, values[definition.key] ?? disabled])) as Record<LimitKey, LimitValue>;
}

export const PLAN_SEED: Plan[] = [
  {
    id: 'plan_starter',
    name: 'Starter',
    slug: 'starter',
    description: 'Website chat for a single team getting started.',
    price: 19,
    currency: 'USD',
    billingInterval: 'monthly',
    status: 'active',
    custom: false,
    features: toggles<FeatureKey>(ALL_FEATURE_KEYS, ['website_chat', 'lead_generation']),
    channels: toggles<ChannelKey>(ALL_CHANNEL_KEYS, ['website_chat']),
    limits: limits({
      monthly_messages: limited(5_000),
      leads: limited(500),
      agents: limited(2),
      team_members: limited(3),
      connected_channels: limited(1),
    }),
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'plan_professional',
    name: 'Professional',
    slug: 'professional',
    description: 'Social channels plus AI replies for a growing support team.',
    price: 79,
    currency: 'USD',
    billingInterval: 'monthly',
    status: 'active',
    custom: false,
    features: toggles<FeatureKey>(ALL_FEATURE_KEYS, [
      'website_chat', 'facebook', 'messenger', 'instagram', 'ai_bot', 'human_handover', 'lead_generation', 'analytics',
    ]),
    channels: toggles<ChannelKey>(ALL_CHANNEL_KEYS, ['website_chat', 'facebook', 'instagram']),
    limits: limits({
      monthly_messages: limited(50_000),
      ai_conversations: limited(10_000),
      ai_messages: limited(30_000),
      leads: limited(10_000),
      orders: limited(2_000),
      agents: limited(10),
      team_members: limited(15),
      connected_channels: limited(3),
    }),
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
  },
  {
    id: 'plan_business',
    name: 'Business',
    slug: 'business',
    description: 'Every channel, order management and API access.',
    price: 199,
    currency: 'USD',
    billingInterval: 'monthly',
    status: 'active',
    custom: false,
    features: toggles<FeatureKey>(ALL_FEATURE_KEYS, [
      'website_chat', 'facebook', 'messenger', 'instagram', 'whatsapp', 'ai_bot', 'advanced_ai',
      'human_handover', 'lead_generation', 'order_management', 'analytics', 'api_access',
    ]),
    channels: toggles<ChannelKey>(ALL_CHANNEL_KEYS, ALL_CHANNEL_KEYS),
    limits: limits({
      monthly_messages: limited(200_000),
      ai_conversations: limited(50_000),
      ai_messages: limited(150_000),
      leads: limited(50_000),
      orders: limited(20_000),
      agents: limited(30),
      team_members: limited(50),
      connected_channels: limited(4),
    }),
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-07-21T00:00:00Z',
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Tailored entitlements and limits, negotiated per customer.',
    price: 0,
    currency: 'USD',
    billingInterval: 'yearly',
    status: 'active',
    custom: true,
    features: toggles<FeatureKey>(ALL_FEATURE_KEYS, ALL_FEATURE_KEYS),
    channels: toggles<ChannelKey>(ALL_CHANNEL_KEYS, ALL_CHANNEL_KEYS),
    limits: limits({
      monthly_messages: unlimited,
      ai_conversations: unlimited,
      ai_messages: unlimited,
      leads: unlimited,
      orders: unlimited,
      agents: limited(50),
      team_members: unlimited,
      connected_channels: unlimited,
    }),
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-08-14T00:00:00Z',
  },
];

const emptyOverrides = (): EntitlementOverrides => ({ features: {}, channels: {}, limits: {} });

function aiConfig(overrides: Partial<AiConfiguration> = {}): AiConfiguration {
  return {
    aiEnabled: false,
    aiBotEnabled: false,
    humanHandoverEnabled: false,
    conversationLimit: disabled,
    messageLimit: disabled,
    model: null,
    systemPrompt: '',
    knowledgeSources: [],
    updatedAt: now,
    ...overrides,
  };
}

interface OrgSeed {
  id: string;
  name: string;
  owner: string;
  email: string;
  status: TenantStatus;
  planId: string;
  createdAt: string;
  lastActivityAt: string | null;
  userCount: number;
  overrides?: EntitlementOverrides;
  ai?: Partial<AiConfiguration>;
  connections?: Organization['connections'];
}

const ORG_SEEDS: OrgSeed[] = [
  {
    id: 'org_acme', name: 'Acme Retail', owner: 'Sara Ahmed', email: 'sara@acmeretail.com', status: 'ACTIVE',
    planId: 'plan_professional', createdAt: '2026-02-14T00:00:00Z', lastActivityAt: '2026-09-18T07:40:00Z', userCount: 12,
    ai: { aiEnabled: true, aiBotEnabled: true, humanHandoverEnabled: true, conversationLimit: limited(10_000), messageLimit: limited(30_000), model: 'ormitech-default', systemPrompt: 'You are Acme Retail’s support assistant. Be concise and never promise delivery dates.' },
    connections: { website_chat: 'connected', facebook: 'connected', instagram: 'connected' },
  },
  {
    id: 'org_northwind', name: 'Northwind Logistics', owner: 'Imran Hossain', email: 'imran@northwind.co', status: 'ACTIVE',
    planId: 'plan_business', createdAt: '2026-03-02T00:00:00Z', lastActivityAt: '2026-09-17T18:05:00Z', userCount: 34,
    ai: { aiEnabled: true, aiBotEnabled: true, humanHandoverEnabled: true, conversationLimit: limited(50_000), messageLimit: limited(150_000), model: 'ormitech-default' },
    connections: { website_chat: 'connected', facebook: 'connected', instagram: 'connected', whatsapp: 'connected' },
  },
  {
    // The spec's override example: a Starter organization with Instagram and the AI bot manually enabled.
    id: 'org_bright', name: 'Bright Dental', owner: 'Nusrat Jahan', email: 'nusrat@brightdental.com', status: 'TRIAL',
    planId: 'plan_starter', createdAt: '2026-08-29T00:00:00Z', lastActivityAt: '2026-09-18T06:12:00Z', userCount: 4,
    overrides: { features: { instagram: true, ai_bot: true }, channels: { instagram: true }, limits: { ai_conversations: { kind: 'limited', value: 1_000 } } },
    ai: { aiEnabled: true, aiBotEnabled: true, conversationLimit: limited(1_000), messageLimit: limited(3_000), model: 'ormitech-default' },
    connections: { website_chat: 'connected', instagram: 'disconnected' },
  },
  {
    id: 'org_coastal', name: 'Coastal Realty', owner: 'Tanvir Alam', email: 'tanvir@coastalrealty.com', status: 'ACTIVE',
    planId: 'plan_professional', createdAt: '2026-04-11T00:00:00Z', lastActivityAt: '2026-09-16T11:22:00Z', userCount: 9,
    overrides: { features: {}, channels: {}, limits: { ai_conversations: { kind: 'unlimited' } } },
    ai: { aiEnabled: true, aiBotEnabled: true, humanHandoverEnabled: true, conversationLimit: unlimited, messageLimit: limited(30_000) },
    connections: { website_chat: 'connected', facebook: 'error' },
  },
  {
    id: 'org_zenith', name: 'Zenith Media', owner: 'Rifat Karim', email: 'rifat@zenithmedia.io', status: 'SUSPENDED',
    planId: 'plan_professional', createdAt: '2026-02-27T00:00:00Z', lastActivityAt: '2026-08-30T09:10:00Z', userCount: 7,
    connections: { website_chat: 'disconnected', facebook: 'disconnected' },
  },
  {
    id: 'org_orbit', name: 'Orbit Foods', owner: 'Mahin Rahman', email: 'mahin@orbitfoods.com', status: 'PENDING',
    planId: 'plan_starter', createdAt: '2026-09-15T00:00:00Z', lastActivityAt: null, userCount: 1,
    connections: { website_chat: 'not_configured' },
  },
  {
    id: 'org_vertex', name: 'Vertex Clinic', owner: 'Dr. Farhana Islam', email: 'farhana@vertexclinic.com', status: 'ACTIVE',
    planId: 'plan_enterprise', createdAt: '2025-11-19T00:00:00Z', lastActivityAt: '2026-09-18T08:51:00Z', userCount: 62,
    overrides: { features: {}, channels: {}, limits: { agents: { kind: 'limited', value: 50 } } },
    ai: { aiEnabled: true, aiBotEnabled: true, humanHandoverEnabled: true, conversationLimit: unlimited, messageLimit: unlimited, model: 'ormitech-advanced', systemPrompt: 'Clinical front-desk assistant. Never give medical advice; always offer to book an appointment.' },
    connections: { website_chat: 'connected', facebook: 'connected', instagram: 'connected', whatsapp: 'connected' },
  },
  {
    id: 'org_lumen', name: 'Lumen Fitness', owner: 'Sabbir Ahmed', email: 'sabbir@lumenfit.com', status: 'CANCELLED',
    planId: 'plan_starter', createdAt: '2026-01-23T00:00:00Z', lastActivityAt: '2026-07-04T15:30:00Z', userCount: 2,
    connections: { website_chat: 'disconnected' },
  },
  {
    id: 'org_harbor', name: 'Harbor Books', owner: 'Ayesha Siddiqua', email: 'ayesha@harborbooks.com', status: 'ACTIVE',
    planId: 'plan_business', createdAt: '2026-05-08T00:00:00Z', lastActivityAt: '2026-09-17T13:47:00Z', userCount: 18,
    ai: { aiEnabled: true, aiBotEnabled: true, humanHandoverEnabled: true, conversationLimit: limited(50_000), messageLimit: limited(150_000) },
    connections: { website_chat: 'connected', facebook: 'connected', whatsapp: 'connected' },
  },
  {
    id: 'org_pioneer', name: 'Pioneer Motors', owner: 'Jahid Hasan', email: 'jahid@pioneermotors.com', status: 'TRIAL',
    planId: 'plan_professional', createdAt: '2026-09-04T00:00:00Z', lastActivityAt: '2026-09-18T05:02:00Z', userCount: 6,
    ai: { aiEnabled: true, aiBotEnabled: true, conversationLimit: limited(10_000), messageLimit: limited(30_000) },
    connections: { website_chat: 'connected', facebook: 'connected' },
  },
  {
    id: 'org_nova', name: 'Nova Interiors', owner: 'Shamima Akter', email: 'shamima@novainteriors.com', status: 'ACTIVE',
    planId: 'plan_starter', createdAt: '2026-06-17T00:00:00Z', lastActivityAt: '2026-09-14T10:15:00Z', userCount: 3,
    connections: { website_chat: 'connected' },
  },
  {
    id: 'org_summit', name: 'Summit Travel', owner: 'Rahim Uddin', email: 'rahim@summittravel.com', status: 'ACTIVE',
    planId: 'plan_enterprise', createdAt: '2025-09-30T00:00:00Z', lastActivityAt: '2026-09-18T08:20:00Z', userCount: 41,
    ai: { aiEnabled: true, aiBotEnabled: true, humanHandoverEnabled: true, conversationLimit: unlimited, messageLimit: unlimited, model: 'ormitech-advanced' },
    connections: { website_chat: 'connected', facebook: 'connected', instagram: 'connected', whatsapp: 'connected' },
  },
];

export const ORGANIZATION_SEED: Organization[] = ORG_SEEDS.map((seed) => ({
  id: seed.id,
  name: seed.name,
  slug: seed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  ownerName: seed.owner,
  ownerEmail: seed.email,
  status: seed.status,
  planId: seed.planId,
  createdAt: seed.createdAt,
  lastActivityAt: seed.lastActivityAt,
  userCount: seed.userCount,
  overrides: seed.overrides ?? emptyOverrides(),
  ai: aiConfig(seed.ai),
  connections: seed.connections ?? {},
}));

const USER_ROLES: OrganizationUserRole[] = ['owner', 'admin', 'agent', 'agent', 'viewer'];
const USER_NAMES = ['Owner Account', 'Team Admin', 'Support Agent', 'Sales Agent', 'Read-only Analyst'];

export const ORGANIZATION_USER_SEED: OrganizationUser[] = ORG_SEEDS.flatMap((seed, orgIndex) => {
  const count = Math.min(Math.max(seed.userCount, 1), 5);
  return Array.from({ length: count }, (_, index) => {
    const isOwner = index === 0;
    return {
      id: `usr_${seed.id}_${index + 1}`,
      organizationId: seed.id,
      name: isOwner ? seed.owner : `${USER_NAMES[index] ?? 'Team Member'} ${index + 1}`,
      email: isOwner ? seed.email : `user${index + 1}@${seed.email.split('@')[1]}`,
      role: USER_ROLES[index] ?? 'agent',
      status: seed.status === 'CANCELLED' ? 'disabled' : index === count - 1 && orgIndex % 3 === 0 ? 'invited' : 'active',
      lastActiveAt: seed.lastActivityAt,
      createdAt: seed.createdAt,
    } satisfies OrganizationUser;
  });
});

export const USAGE_SEED: Record<string, UsageSnapshot> = {
  org_acme: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 32_000, ai_conversations: 6_500, ai_messages: 19_400, leads: 2_100, orders: 340, agents: 8, team_members: 12, connected_channels: 3 } },
  org_northwind: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 148_000, ai_conversations: 31_200, ai_messages: 94_000, leads: 12_800, orders: 4_120, agents: 22, team_members: 34, connected_channels: 4 } },
  org_bright: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 1_240, ai_conversations: 410, leads: 96, agents: 2, team_members: 4, connected_channels: 2 } },
  org_coastal: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 41_500, ai_conversations: 14_300, ai_messages: 22_800, leads: 5_600, orders: 210, agents: 7, team_members: 9, connected_channels: 2 } },
  org_zenith: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 0, ai_conversations: 0, leads: 0, agents: 5, team_members: 7, connected_channels: 0 } },
  org_orbit: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 0, leads: 0, agents: 1, team_members: 1, connected_channels: 0 } },
  org_vertex: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 512_000, ai_conversations: 98_400, ai_messages: 288_000, leads: 41_200, orders: 9_800, agents: 44, team_members: 62, connected_channels: 4 } },
  org_lumen: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 0, leads: 0, agents: 0, team_members: 2, connected_channels: 0 } },
  org_harbor: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 96_400, ai_conversations: 22_100, ai_messages: 61_300, leads: 8_900, orders: 6_400, agents: 14, team_members: 18, connected_channels: 3 } },
  org_pioneer: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 8_200, ai_conversations: 1_900, ai_messages: 4_600, leads: 720, orders: 40, agents: 4, team_members: 6, connected_channels: 2 } },
  org_nova: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 3_100, leads: 240, agents: 2, team_members: 3, connected_channels: 1 } },
  org_summit: { periodStart: '2026-09-01', periodEnd: '2026-09-30', values: { monthly_messages: 388_000, ai_conversations: 74_600, ai_messages: 210_500, leads: 28_400, orders: 12_100, agents: 31, team_members: 41, connected_channels: 4 } },
};
