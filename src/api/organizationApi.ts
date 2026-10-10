import { axiosClient } from './axiosClient';
import type { Paginated } from '@/types/api';
import { DISABLED } from '@/types/entitlements';
import type { Organization, OrganizationInput, OrganizationListParams, TenantStatus } from '@/types/organization';

/**
 * Real HTTP calls for organization management against `ormitech-api`.
 *
 * Reachable only when `VITE_ADMIN_DATA_SOURCE=api`. Three of the five calls below still have no endpoint —
 * creating and fully editing an organization are the customer's own sign-up and settings, not an admin
 * action, and nothing here invents a response for them.
 *
 * What does exist is the list, the detail and the status change, and the search and paging the list takes:
 *
 *   GET /admin/organizations?search&status&plan&sort&order&page&limit
 *     -> { items: [...], meta: { page, limit, total, totalPages } }
 *
 * The API's organization is narrower than this app's `Organization`, which was shaped around the fixtures:
 * entitlement overrides, AI configuration and channel connections are not part of these endpoints, so
 * `fromApi` leaves them empty rather than guessing. The screens that read them are the ones still on the
 * fixture data source.
 */
const unwrap = <T>(promise: Promise<{ data: { data: T } }>) => promise.then((response) => response.data.data);

interface ApiOrganizationListItem {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  status: string;
  plan: string;
  memberCount: number;
  createdAt: string;
}

interface ApiOrganizationMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface ApiOrganizationDetail extends Omit<ApiOrganizationListItem, 'memberCount'> {
  logoUrl: string | null;
  website: string | null;
  address: string | null;
  timezone: string;
  updatedAt: string;
  members: ApiOrganizationMember[];
}

interface ApiPage<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** The API's lowercase statuses, in this app's vocabulary. An unknown one is shown as pending, not dropped. */
const STATUS: Record<string, TenantStatus> = {
  active: 'ACTIVE',
  trial: 'TRIAL',
  suspended: 'SUSPENDED',
  cancelled: 'CANCELLED',
  canceled: 'CANCELLED',
  pending: 'PENDING',
};

const toTenantStatus = (status: string): TenantStatus => STATUS[status.toLowerCase()] ?? 'PENDING';

/** The reverse, for the status change the API accepts. */
const toApiStatus = (status: TenantStatus): string => status.toLowerCase();

function fromApi(row: ApiOrganizationListItem | ApiOrganizationDetail, owner?: ApiOrganizationMember): Organization {
  const memberCount = 'memberCount' in row ? row.memberCount : ('members' in row ? row.members.length : 0);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    // The list endpoint does not join the owner; the detail endpoint's members do. Falling back to the
    // organization's own contact address is better than an empty cell, and it is never a different person's.
    ownerName: owner?.name ?? '—',
    ownerEmail: owner?.email ?? row.email ?? '—',
    status: toTenantStatus(row.status),
    planId: row.plan,
    createdAt: row.createdAt,
    lastActivityAt: null,
    userCount: memberCount,
    // Empty rather than invented: these are not part of the admin organization endpoints, and a default that
    // looked like data would be read as the customer's actual configuration.
    overrides: { features: {}, channels: {}, limits: {} },
    ai: {
      aiEnabled: false,
      aiBotEnabled: false,
      humanHandoverEnabled: false,
      conversationLimit: DISABLED,
      messageLimit: DISABLED,
      model: null,
      systemPrompt: '',
      knowledgeSources: [],
      imageReadEnabled: false,
      voiceEnabled: false,
      commentReplyEnabled: false,
      followUpEnabled: true,
      followUpDelayMinutes: 15,
      linkReadEnabled: false,
      updatedAt: row.createdAt,
    },
    connections: {},
  };
}

export const organizationApi = {
  list: async (params: OrganizationListParams): Promise<Paginated<Organization>> => {
    const page = params.page ?? 1;
    const limit = params.pageSize ?? 20;

    const result = await unwrap<ApiPage<ApiOrganizationListItem>>(
      axiosClient.get('/admin/organizations', {
        params: {
          search: params.query?.trim() || undefined,
          status: params.status && params.status !== 'all' ? toApiStatus(params.status) : undefined,
          plan: params.planId && params.planId !== 'all' ? params.planId : undefined,
          // `userCount` is not a column the API sorts by; it falls back to creation order rather than
          // silently returning a differently ordered page.
          sort: params.sort === 'name' ? 'name' : 'createdAt',
          order: params.direction ?? 'desc',
          page,
          limit,
        },
      }),
    );

    return {
      items: result.items.map((row) => fromApi(row)),
      total: result.meta.total,
      page: result.meta.page,
      pageSize: result.meta.limit,
    };
  },

  get: async (id: string): Promise<Organization> => {
    const detail = await unwrap<ApiOrganizationDetail>(axiosClient.get(`/admin/organizations/${id}`));
    const owner = detail.members.find((member) => member.role === 'owner');
    return fromApi(detail, owner);
  },

  /** No endpoint: an organization is created by its own owner signing up. */
  create: (input: OrganizationInput) => unwrap<Organization>(axiosClient.post('/admin/organizations', input)),

  /** No endpoint yet: only the status is an admin-changeable field today — see `setStatus`. */
  update: (id: string, input: OrganizationInput) =>
    unwrap<Organization>(axiosClient.patch(`/admin/organizations/${id}`, input)),

  setStatus: async (id: string, status: TenantStatus): Promise<Organization> => {
    await unwrap<{ id: string; status: string }>(
      axiosClient.patch(`/admin/organizations/${id}`, { status: toApiStatus(status) }),
    );
    // Re-read: the endpoint answers with the id and the new status, and every screen that calls this expects
    // the whole organization back.
    return organizationApi.get(id);
  },
};
