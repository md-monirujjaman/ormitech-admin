/**
 * The shapes `ormitech-api` answers with for `/admin/ai/...` (see ormitech-api `AdminAiCatalogService`). Nothing here
 * is a secret: the API never returns an API key, only whether one is stored and a mask of its last four characters.
 */

export type ProviderHealthStatus = 'unknown' | 'healthy' | 'unhealthy' | 'unauthorized';

export interface AiProvider {
  id: string;
  slug: string;
  name: string;
  type: string;
  baseUrl: string;
  enabled: boolean;
  isDefault: boolean;
  /** Lower is tried first. */
  priority: number;
  credential: { configured: boolean; mask: string | null; updatedAt: string | null };
  health: { status: ProviderHealthStatus; checkedAt: string | null; error: string | null };
  modelCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ModelCapability = 'chat' | 'vision' | 'json_output' | 'audio';

export interface AiModel {
  id: string;
  providerId: string;
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
  isDefault: boolean;
  availabilityVerifiedAt: string | null;
  planSlugs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProviderCheckResult {
  provider: AiProvider;
  check: { status: 'healthy' | 'unhealthy' | 'unauthorized'; error: string | null };
}

export type VerificationReason = 'available' | 'not_found' | 'unauthorized' | 'unreachable' | 'no_key' | 'provider_url_invalid';

export interface ModelVerificationResult {
  model: AiModel;
  verification: { verified: boolean; reason: VerificationReason };
}

// Inputs

export interface CreateProviderInput {
  slug: string;
  name: string;
  baseUrl?: string;
  priority?: number;
  /** Sent once and never kept: the API stores it encrypted and does not return it. */
  apiKey?: string;
}

export interface UpdateProviderInput {
  name?: string;
  baseUrl?: string;
  priority?: number;
}

export interface CreateModelInput {
  providerId: string;
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
}

export interface RoutingOverview {
  environment: { orchestrationEnabled: boolean; maxRetries: number; requestTimeoutMs: number; openrouterKeyPresent: boolean };
  policy: RoutingPolicy;
  models: RoutingModelView[];
  defaults: { intentSlots: Record<string, number> };
  intents: string[];
  effective: { routingActive: boolean };
}

export interface RoutingProblem {
  level: 'error' | 'warning';
  role: ModelRole | 'policy';
  code: string;
  message: string;
}

export type UpdateRoutingInput = Partial<
  Pick<RoutingPolicy, 'enabled' | 'routerEnabled' | 'slot1Enabled' | 'slot2Enabled' | 'slot3Enabled' | 'slot4Enabled' | 'maxRetries' | 'requestTimeoutMs' | 'routerTimeoutMs' | 'maxOutputTokens' | 'routerMaxTokens' | 'offtopicConfidence' | 'breakerThreshold' | 'breakerOpenSeconds' | 'maxAttemptsPerMessage' | 'reasoningEfforts' | 'intentSlots'>
> & {
  routerModelId?: string | null;
  slot1ModelId?: string | null;
  slot2ModelId?: string | null;
  slot3ModelId?: string | null;
  slot4ModelId?: string | null;
  fallbackSlots?: Array<1 | 2 | 3>;
};
