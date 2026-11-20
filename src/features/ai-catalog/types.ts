/**
 * The shapes `ormitech-api` answers with for `/admin/ai/...` (see ormitech-api `AdminAiCatalogService`). Nothing here
 * is a secret: the API key lives in the server environment and is never returned, only whether one is set and its last four characters.
 */

/** The AI gateway: where AI requests go. The key lives in the server environment and is never here, only whether one is set and its last four characters. */
export interface AiGateway {
  configured: boolean;
  baseUrl: string;
  keyMask: string | null;
  providerId: string | null;
}

export type GatewayHealth = 'healthy' | 'unauthorized' | 'unhealthy' | 'no_key';

export interface GatewayCheckResult {
  gateway: AiGateway;
  check: { status: GatewayHealth; error: string | null };
}

export type ModelCapability = 'chat' | 'vision' | 'json_output' | 'audio';

export interface AiModel {
  id: string;
  providerSlug: string;
  /** The provider's own id for the model. */
  modelId: string;
  displayName: string;
  description: string;
  /** Prices are decimal strings with 8 places, as stored: they are never turned into floats. */
  pricing: {
    inputPerMillion: string | null;
    outputPerMillion: string | null;
    cachedInputPerMillion: string | null;
    currency: string;
    note: string | null;
    updatedAt: string | null;
  };
  contextWindow: number | null;
  capabilities: ModelCapability[];
  enabled: boolean;
  availabilityVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VerificationReason = 'available' | 'not_found' | 'unauthorized' | 'unreachable' | 'no_key' | 'provider_url_invalid';

export interface ModelVerificationResult {
  model: AiModel;
  verification: { verified: boolean; reason: VerificationReason };
}

// Inputs

export interface CreateModelInput {
  modelId: string;
  displayName: string;
  description?: string;
  contextWindow?: number | null;
  capabilities?: ModelCapability[];
}

export interface UpdateModelInput {
  displayName?: string;
  description?: string;
  contextWindow?: number | null;
  capabilities?: ModelCapability[];
}

export interface SetPricingInput {
  inputPerMillion: string;
  outputPerMillion: string;
  cachedInputPerMillion: string | null;
  currency: string;
  note: string | null;
}

// Multi-model routing (`/admin/ai/routing`, ormitech-api migration 0073)

export type ModelRole = 'router' | 'slot1' | 'slot2' | 'slot3' | 'slot4';
export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'default';

export interface RoutingPolicy {
  enabled: boolean;
  routerModelId: string | null;
  routerEnabled: boolean;
  slot1ModelId: string | null;
  slot2ModelId: string | null;
  slot3ModelId: string | null;
  slot4ModelId: string | null;
  slot1Enabled: boolean;
  slot2Enabled: boolean;
  slot3Enabled: boolean;
  slot4Enabled: boolean;
  /** null: the environment default (AI_MAX_RETRIES). */
  maxRetries: number | null;
  /** null: the environment default (AI_REQUEST_TIMEOUT). */
  requestTimeoutMs: number | null;
  routerTimeoutMs: number;
  maxOutputTokens: number;
  routerMaxTokens: number;
  offtopicConfidence: number;
  fallbackSlots: number[];
  breakerThreshold: number;
  breakerOpenSeconds: number;
  maxAttemptsPerMessage: number;
  intentSlots: Record<string, number>;
  reasoningEfforts: Partial<Record<ModelRole, ReasoningEffort>>;
  /** The efforts each chosen model accepts, by catalogue model id. A model not listed: not recorded, so no effort is sent to it. */
  modelEfforts: Record<string, string[]>;
  updatedAt: string;
}

export interface RoutingModelView {
  role: ModelRole;
  modelRowId: string;
  modelId: string;
  displayName: string;
  providerSlug: string;
  capabilities: string[];
  contextWindow: number | null;
  usable: boolean;
  acceptedEfforts: string[] | null;
  /** What the policy asks for this role. */
  requestedEffort: ReasoningEffort;
  /** What is actually sent (`default`: nothing). */
  sends: ReasoningEffort;
}

export interface RoutingOverview {
  /** Where requests go: whether the key is set in the server environment, and the address. Never the key. */
  gateway: { configured: boolean; baseUrl: string };
  environment: { maxRetries: number; requestTimeoutMs: number };
  policy: RoutingPolicy;
  models: RoutingModelView[];
  defaults: { intentSlots: Record<string, number>; reasoningEfforts: Record<ModelRole, ReasoningEffort> };
  intents: string[];
  effective: { gatewayReady: boolean; routingActive: boolean };
}

export interface RoutingProblem {
  level: 'error' | 'warning';
  role: ModelRole | 'policy';
  code: string;
  message: string;
}

export type UpdateRoutingInput = Partial<
  Pick<RoutingPolicy, 'enabled' | 'routerEnabled' | 'slot1Enabled' | 'slot2Enabled' | 'slot3Enabled' | 'slot4Enabled' | 'maxRetries' | 'requestTimeoutMs' | 'routerTimeoutMs' | 'maxOutputTokens' | 'routerMaxTokens' | 'offtopicConfidence' | 'breakerThreshold' | 'breakerOpenSeconds' | 'maxAttemptsPerMessage' | 'reasoningEfforts' | 'intentSlots' | 'modelEfforts'>
> & {
  routerModelId?: string | null;
  slot1ModelId?: string | null;
  slot2ModelId?: string | null;
  slot3ModelId?: string | null;
  slot4ModelId?: string | null;
  fallbackSlots?: Array<1 | 2 | 3>;
};
