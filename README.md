# ormitech-admin

Internal control center for the OrmiTech platform — organizations, users, plans, entitlements, channels, AI
configuration and platform operations. Sibling project to `ormitech-web`, `ormitech-client`, `ormitech-api` and
`ormitech-docs`; this app never talks to a database directly and holds no secrets — every real action it
eventually takes goes through `ormitech-api`.

```
OrmiTech Admin → OrmiTech API → Database / Services → Web / Client / Docs / Integrations
```

Production: `https://ormitech-admin.monirujjaman.me`
Local: `http://localhost:5173`

## Status

**Phase 1** built the shell: layout, navigation, RBAC, auth architecture, routing, dashboard.
**Phase 2** built the tenant control architecture: organizations, organization users, plans, features, channel
entitlements, AI configuration, limits and usage — all on a single entitlement model.
**Phase 3** built the billing and usage control architecture on top of it: subscriptions and their lifecycle,
payments, invoices, quotas, limit alerts, revenue overview and per-organization billing.

None of it is connected to a live backend yet: `ormitech-api`'s admin endpoints don't exist. Every screen runs
against an in-memory mock data source that is **labeled as mock in the UI**, and the real HTTP modules are
written and ready behind the same interface. Nothing fabricates a successful response from an endpoint that
isn't there.

## Technology stack

React 19 · Vite 6 · TypeScript (strict) · Tailwind CSS 4 · shadcn-style components on Radix primitives ·
React Router 7 · TanStack Query 5 · Axios · Zod · React Hook Form · Zustand · Lucide React · Recharts.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:5173
```

```bash
npm run build       # tsc -b && vite build
npm run preview      # serve the production build
npm run lint         # eslint
npm run typecheck    # tsc -b --noEmit
```

## Environment variables

All `VITE_*` — Vite inlines every one of these into the browser bundle, so **none of them may ever be a
secret**. See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL every request in `api/axiosClient.ts` is built from |
| `VITE_CLIENT_URL` | Link out to the customer dashboard (`ormitech-client`) |
| `VITE_DOCS_URL` | Link out to the docs site (`ormitech-docs`) |
| `VITE_WEB_URL` | Link out to the marketing site (`ormitech-web`) |
| `VITE_ADMIN_DATA_SOURCE` | `mock` (default) or `api` — which `AdminDataSource` backs every screen |

## The entitlement model

This is the core of Phase 2. What a tenant may do resolves in exactly one place
(`lib/entitlements.ts::resolveEntitlements`), and every screen reads the result:

```
Plan defaults  ─┐
                ├─▶ resolveEntitlements() ─▶ ResolvedEntitlements ─▶ every screen
Org overrides  ─┘
```

- **Plans** (`types/plan.ts`) carry feature toggles, channel toggles and limits. Plans are data — the admin
  defines them; "Starter/Professional/Business/Enterprise" is seed data, not a type.
- **Overrides** (`EntitlementOverrides`) are sparse and per organization. An absent key inherits from the plan,
  which is what lets a plan change flow through for everything not explicitly overridden. An override survives a
  plan change — an entitlement granted on purpose isn't silently revoked.
- **Resolved entitlements** carry their `source` (`plan` | `override`), so the UI can show an "Overridden" badge
  and offer a reset rather than hiding the exception.
- **Limits are a tagged union**, never a bare number:

  ```ts
  type LimitValue = { kind: 'disabled' } | { kind: 'limited'; value: number } | { kind: 'unlimited' };
  ```

  "Unlimited" is a real state the backend can enforce (skip the cap check), not a label painted over a large
  number, and it is distinct from "disabled" and from a limit of 0.
- **Enterprise/custom plans** need no special case: a plan marked `custom` plus per-organization overrides
  already expresses "unlimited messages, 50 agents, every channel".
- **Plan changes are previewed, never silent**: `diffEntitlements` computes every feature, channel and limit
  that would change, and the confirmation dialog calls out losses specifically before anything is applied.

Features, channels and limits are **catalogs fetched from the API** (`featureApi`, `channelApi`), not constants
compiled into components — adding a channel later is a catalog entry, not a UI change.

## Billing & quotas

Billing sits on top of the entitlement model rather than beside it:

```
Organization → Subscription → Plan → Entitlements → Usage / Quotas
```

- A **subscription** (`types/billing.ts`) is the billing record — status, price, interval, dates. It never
  carries its own copy of what a tenant may do; entitlements still resolve through `resolveEntitlements`, so
  plan logic exists in exactly one place. Assigning a plan updates the organization and its subscription along
  the same code path, so the two can't drift.
- **Lifecycle** states are `TRIAL`, `ACTIVE`, `PAST_DUE`, `PAUSED`, `CANCELLED`, `EXPIRED`, with the legal moves
  between them declared in `SUBSCRIPTION_TRANSITIONS` (`lib/billing.ts`) — the shape an automated dunning or
  renewal job on ormitech-api would follow.
- **MRR** counts `ACTIVE` and `PAST_DUE` subscriptions, normalizing yearly prices to a twelfth. Past-due is
  included deliberately: the contract stands, the payment is late — excluding it would make a collections
  problem look like churn.
- A **quota** (`types/quota.ts`, `lib/quotas.ts`) is a resolved limit plus what's been consumed. Its math is
  delegated to the same `computeUsageMetric` the usage screens use, so quota and usage displays can't disagree.
  Periods are `monthly`, `daily`, `per_conversation`, `per_organization`.
- **Limit alerts** fire at 50 / 75 / 90 / 100%, mapping to Normal / Warning / Critical / Exceeded. The Admin
  computes and displays them; delivering notifications is backend work — a browser is not a notification system.
- **Unlimited stays explicit** everywhere in billing too: quotas reuse `LimitValue`, so nothing infers
  "unlimited" from a large number, and `999999999` means exactly that.

No payment gateway is integrated and none will be here — charging, refunds and dunning belong to ormitech-api.
Payment records carry a public `transactionReference` only; gateway keys and secrets never reach this bundle.
Invoice PDFs are the same story: `invoiceApi.downloadUrl` is the seam for a server-rendered, server-signed file,
and the Admin's Download action says plainly that it doesn't exist yet rather than faking one.

## Data source architecture

Every screen reads and writes through one interface, `AdminDataSource` (`api/adminDataSource.ts`) — the same
idea as `ormitech-docs`' `DocSource`:

```
Screens → TanStack Query hooks → AdminDataSource ─┬─ mockDataSource  (default, in-memory fixtures)
                                                  └─ apiDataSource   (organizationApi, userApi, planApi,
                                                                      featureApi, channelApi, aiApi,
                                                                      entitlementApi → ormitech-api)
```

`VITE_ADMIN_DATA_SOURCE=api` switches the whole app over with no component changes. Those endpoints don't exist
yet, so requests will fail until they're built — deliberately, instead of silently falling back to fixtures and
making the Admin look connected when it isn't.

Mock writes mutate an in-memory store and survive until the page reloads, which is what makes the admin flows
genuinely exercisable. Every screen backed by it shows a **Mock data** badge that disappears on its own once the
API source is active.

## What Phase 2 ships

- **Organizations** — search, status/plan/channel filters, sortable columns, pagination; create, edit, suspend,
  activate, change plan.
- **Organization detail** — Overview, Users, Plan, Features, Channels, AI, Usage, Billing, Activity.
- **Tenant status** — `ACTIVE`, `TRIAL`, `SUSPENDED`, `CANCELLED`, `PENDING`, changed behind a confirmation.
- **Organization users** — name, email, role, status, last active, created; view, edit, change role,
  enable/disable.
- **Plans** — full editor for pricing, billing interval, status, and every feature/channel/limit entitlement.
- **Features** — the catalog, its dependencies, and which plans include each feature.
- **Channels** — per-channel plan access, organization access and connection status, plus an entitlement matrix.
  Connecting a channel (Meta OAuth, WhatsApp Cloud API) is explicitly *not* here — that's ormitech-api's work.
- **AI** — per-organization AI/bot/handover toggles, AI limits, and model/prompt/knowledge-source placeholders.
  No AI provider is called from the Admin.
- **Usage** — used, limit, remaining and percentage per limit, with unlimited and disabled rendered honestly.

## What Phase 3 ships

- **Billing Overview** — MRR, active subscriptions, trials, past due, cancelled, payments today and revenue this
  month, plus revenue growth, subscription growth, plan distribution and payment status charts.
- **Subscriptions** — searchable, filterable list with organization, plan, status, interval, price, start,
  renewal and created; view details, change plan, pause, resume and cancel, each behind a confirmation.
- **Subscription details** — the full record plus the entitlements it currently confers (channels, features,
  AI/message/lead/agent limits), read through the Phase 2 resolver.
- **Payments** — payment ID, organization, amount, currency, status, method, date, invoice and transaction
  reference, filterable by status.
- **Invoices** — full record with issue/due/paid dates, view, a Download action that states plainly that PDF
  generation doesn't exist yet, and void (blocked on paid invoices, `invoices.write` only).
- **Usage** — platform-wide quotas per organization with used / limit / remaining / percentage, a drawer with
  every quota, and an alert panel for tenants at 90% or above.
- **Organization billing** — the organization's Billing tab now shows its subscription, renewal information,
  payment history, invoices, and usage against quotas.
- **Plan change preview** — now includes the price change alongside feature, channel and limit changes.

## Auth architecture

```
Admin UI → ormitech-api → admin authentication endpoint → secure session/access token → Admin UI
```

`useAuthStore` holds the session client-side, persisted to `localStorage`. `authApi.login`/`forgotPassword` call
`POST /admin/auth/login` / `POST /admin/auth/forgot-password` — **neither endpoint exists yet**, so both fail
today; that's the intended state, not a bug. There is no public admin registration screen, by design.

`api/axiosClient.ts` attaches the token to every request and, on a `401`, calls the handler `authStore`
registers. The two talk through a setter pair (`setAccessToken`/`setUnauthorizedHandler`) rather than importing
each other, to avoid a cycle.

## RBAC

Six roles (`SUPER_ADMIN`, `ADMIN`, `SUPPORT_ADMIN`, `BILLING_ADMIN`, `CONTENT_ADMIN`, `ANALYTICS_ADMIN`) mapped
to `resource.read` / `resource.write` permissions in `lib/permissions.ts`. `usePermissions()` exposes
`can()`/`canAny()`/`canAll()`. Sidebar items hide what the admin can't see, `<AdminRoute permission="…">` blocks
the route, and every Phase 2 screen gates its write controls — read-only admins get the data plus an explanation
of which permission they'd need.

**This is UI visibility only, not security.** Anyone can read the bundled JS or call `ormitech-api` directly;
every real permission check must be enforced by `ormitech-api` against the admin's actual session. That's stated
in code comments at `hooks/usePermissions.ts` and `routes/AdminRoute.tsx` so it isn't lost later.

## Validation

Zod schemas with React Hook Form throughout (`features/*/schemas.ts`): organization, organization user, plan,
AI configuration, and `limitValueSchema` — a discriminated union, so a form can't produce an ambiguous limit.

## Audit preparation

`lib/audit.ts` names every admin action (`organization.suspended`, `plan.assigned`, `feature.enabled`,
`channel.disabled`, `ai.settings.updated`, …) and every mutation builds the event draft it would send.
`recordAuditEvent` only surfaces drafts in development — there's no audit endpoint yet, and audit history has to
be written by the server from the authenticated request, not by the browser.

## Project structure

```
src/
├── api/            axiosClient, adminDataSource (the interface), apiDataSource, dataSource (the switch),
│                   organizationApi, userApi, planApi, featureApi, channelApi, aiApi, entitlementApi,
│                   subscriptionApi, paymentApi, invoiceApi, usageApi, quotaApi, billingApi
├── mocks/          seed.ts + billingSeed.ts (fixtures), mockDataSource.ts (in-memory AdminDataSource)
├── components/
│   ├── layout/     AdminLayout, Sidebar, MobileSidebar, Topbar, GlobalSearch, NotificationsMenu, ProfileMenu, ThemeToggle
│   ├── navigation/ NavItem, NavSection — permission-filtered, driven by lib/navigation.ts
│   ├── dashboard/  StatCard, charts.tsx, ActivityFeed, SystemStatusGrid
│   ├── shared/     PageHeader, StatusBadge, ConfirmDialog, LimitField, UsageBar, Pagination,
│   │               EntitlementToggleRow, MockDataNotice
│   └── ui/         Button, Card, Table, Tabs, Select, Switch, Dialog, AlertDialog, Progress, …
│                   + LoadingState/ErrorState/EmptyState/ComingSoon
├── features/
│   ├── auth/       authApi, authTypes, pages, AuthCard
│   ├── catalog/    hooks.ts — features/channels/limits catalogs
│   ├── organizations/  hooks, schemas, useEntitlements, pages (list + detail), components (dialogs + 9 tabs)
│   ├── plans/      hooks, schemas, PlansPage, PlanFormDialog
│   ├── features/   FeaturesPage (catalog + plan inclusion)
│   ├── channels/   ChannelsPage (entitlement + connection overview)
│   ├── ai/         AiPage (platform-wide AI overview)
│   ├── billing/    hooks, schemas, charts, BillingOverviewPage
│   ├── subscriptions/  SubscriptionsPage, SubscriptionDetailDialog
│   ├── payments/   PaymentsPage
│   ├── invoices/   InvoicesPage
│   └── usage/      UsagePage (quotas + limit alerts)
├── pages/          Overview (dashboard), ServerHealth, NotFound
├── routes/         AppRoutes, ProtectedRoute, AdminRoute
├── store/          authStore, uiStore
├── types/          auth, admin, navigation, entitlements, catalog, plan, organization, ai, api, billing, quota
├── hooks/          useAuth, usePermissions
└── lib/            utils, constants, navigation, permissions, entitlements, billing, quotas, audit, queryKeys,
                    mockDashboardData
```

## Theme, brand & responsive

Light/dark, applied pre-paint by an inline script in `index.html`. OrmiTech black, white and `#E10032` — red is
reserved for primary actions, active nav, and critical accents, not page backgrounds. Sidebar collapses to
icon-only or becomes a drawer below `lg:`; tables scroll horizontally on small screens; dialogs, sheets and the
global search work at phone width.

## Security

- No secrets, API tokens or database credentials anywhere — every `import.meta.env` read goes through
  `lib/constants.ts`, and only `VITE_*` (public-by-definition) variables exist.
- No public admin registration.
- Frontend permission checks are UI-only; real authorization is `ormitech-api`'s responsibility.
- Destructive actions (suspend, cancel, disable user, role change, plan change with losses) require explicit
  confirmation showing what changes.
- The dashboard's `lib/mockDashboardData.ts` and `src/mocks/` are the only data sources today, and both are
  surfaced as mock in the UI.

## Not in this phase

A real payment gateway (Stripe, bKash, Nagad or any other), a billing backend that actually charges, Meta OAuth,
WhatsApp Cloud API, AI provider execution, webhook processing, background workers and real-time sockets. The
Admin-side billing *control surface* exists; the money movement behind it does not, and belongs to
`ormitech-api`.
