import type { ChannelKey, FeatureKey, LimitKey } from './entitlements';

/**
 * The catalogs that make features, channels and limits data-driven. These come from the API
 * (`featureApi`/`channelApi`) rather than being hardcoded in components, so adding a channel or feature later
 * is a data change, not a UI change.
 */

export type FeatureCategory = 'channels' | 'ai' | 'engagement' | 'platform' | 'branding';

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  description: string;
  category: FeatureCategory;
  /** Features this one needs in order to function — the UI warns rather than silently allowing a broken combination. */
  dependsOn?: FeatureKey[];
  beta?: boolean;
}

export type ChannelAvailability = 'available' | 'coming_soon';

export interface ChannelDefinition {
  key: ChannelKey;
  name: string;
  description: string;
  /** The feature entitlement that gates this channel, so channel access stays one concept, not two. */
  featureKey: FeatureKey;
  availability: ChannelAvailability;
}

export interface LimitDefinition {
  key: LimitKey;
  name: string;
  description: string;
  unit: string;
  period: 'month' | 'total';
}

export type ChannelConnectionStatus = 'connected' | 'disconnected' | 'error' | 'not_configured';
