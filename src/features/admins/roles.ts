/**
 * The one role name `ormitech-api` enforces, matching `admin_roles.name` seeded by its migration 0014.
 *
 * Declared here as well as mapped in `features/auth/authApi.ts` because this screen sends it: a role the API
 * does not know is refused with 400 rather than created.
 */
export const SUPER_ADMIN_ROLE = 'super_admin';

/**
 * The role that may write the documentation (`/admin/docs`) and nothing else beyond signing in. Seeded by
 * `ormitech-api` migration 0030.
 */
export const CONTENT_ADMIN_ROLE = 'content_admin';
