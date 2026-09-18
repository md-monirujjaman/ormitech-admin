import { axiosClient } from './axiosClient';
import type { ChannelDefinition } from '@/types/catalog';

/**
 * The channel catalog. Adding a future channel is a catalog entry, not a UI change.
 *
 * Connecting a channel (Meta OAuth, WhatsApp Cloud API) is explicitly *not* part of this module — that is
 * integration work owned by ormitech-api in a later phase. The Admin only manages entitlement, and displays
 * connection status the API reports. Endpoints do not exist yet.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

export const channelApi = {
  list: () => unwrap<ChannelDefinition[]>(axiosClient.get('/admin/channels')),
};
