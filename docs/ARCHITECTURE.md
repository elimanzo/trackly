# Architecture Overview

A guide for new contributors: how the codebase is structured, where things go, and the conventions to follow.

---

## High-level mental model

```
Browser → Next.js App Router → Server Actions → Supabase (Postgres + RLS)
```

- **Pages** are React Server Components. They fetch data server-side via Supabase.
- **Mutations** go through Next.js **Server Actions** in `src/app/actions/`. Never write raw SQL or Supabase calls in page/component files.
- **RLS (Row Level Security)** enforces org isolation at the database layer. Every table has policies that gate reads/writes by org membership.

---

## Directory map

```
src/
├── app/
│   ├── (app)/                  # Authenticated app shell
│   │   └── orgs/
│   │       ├── page.tsx        # Org picker
│   │       └── [slug]/         # Org-scoped routes
│   │           ├── dashboard/
│   │           ├── assets/
│   │           │   ├── page.tsx          # Asset list
│   │           │   └── [id]/page.tsx     # Asset detail
│   │           └── settings/
│   │               ├── org/              # Org config (name, dashboard toggles)
│   │               ├── members/          # Member management + invites
│   │               ├── departments/
│   │               ├── locations/
│   │               └── ...
│   ├── (onboarding)/           # Org creation wizard (/org/new, /setup/*)
│   ├── (auth)/                 # Login, signup, invite accept, password reset
│   ├── actions/                # ALL server actions (mutations) live here
│   │   ├── _context.ts         # getContext() / getAdminCtx() — auth + org resolution
│   │   ├── _audit.ts           # logAudit() — fire-and-forget audit trail
│   │   ├── assets.ts
│   │   ├── org.ts
│   │   ├── invites.ts
│   │   └── ...
│   └── auth/                   # OAuth callback route handler
│
├── components/                 # Shared UI components (shadcn/ui wrappers + custom)
│
├── lib/
│   ├── checkout/               # Checkout domain logic (pure functions + ports)
│   │   ├── domain.ts           # Business rules — no Supabase imports
│   │   ├── ports.ts            # Repository + audit interfaces
│   │   ├── adapter.ts          # Supabase implementation of the ports
│   │   └── __tests__/
│   ├── hooks/                  # React Query hooks (data fetching + cache invalidation)
│   ├── permissions/            # Permission policy (role → allowed actions)
│   ├── supabase/               # Supabase client factories
│   │   ├── client.ts           # Browser client (singleton)
│   │   ├── server.ts           # Server client (per-request, reads cookies)
│   │   └── admin.ts            # Service-role client (bypasses RLS)
│   └── types/                  # Zod schemas + inferred TypeScript types
│
└── providers/
    ├── AuthProvider.tsx         # Session + user profile (org memberships)
    ├── OrgProvider.tsx          # Active org context, role, settings
    └── OnboardingProvider.tsx   # Wizard state for org creation

supabase/
├── migrations/                 # Schema migrations — applied in filename order
├── seeds/                      # Dev seed data (applied by `pnpm db:reset`)
└── templates/                  # Custom Supabase email templates
```

---

## Server actions

All mutations happen in `src/app/actions/`. Each file owns one domain (assets, members, org, etc.).

### Context helpers

Every action starts by resolving auth + org identity:

```ts
// For owner/admin-only actions — also checks role
const ctx = await getAdminCtx(orgSlug)
if ('error' in ctx) return ctx

// For any authenticated action — resolves user + org
const ctx = await getContext(orgSlug)
if ('error' in ctx) return ctx
```

`ctx` gives you: `ctx.userId`, `ctx.orgId`, `ctx.role`, `ctx.supabase` (user client), `ctx.admin` (service-role client).

### Audit logging

After any write, call `logAudit()` fire-and-forget:

```ts
await logAudit(ctx, {
  entityType: 'asset', // 'asset' | 'user' | 'org' | 'department' | ...
  entityId: asset.id,
  entityName: asset.name,
  action: 'created', // 'created' | 'updated' | 'deleted' | 'checked_out' | 'returned'
  changes: { name: { old: null, new: 'Laptop' } },
})
```

### Soft deletes

Use `softDeleteWithCascade()` instead of hard deletes:

```ts
return softDeleteWithCascade(ctx, {
  entityTable: 'departments',
  entityType: 'department',
  entityId: id,
  assetFkColumn: 'department_id', // FK column on the assets table to null out
})
```

---

## Permissions

Permissions are enforced in two places:

1. **RLS policies** — database layer, always enforced regardless of how the DB is accessed.
2. **`createPolicy(role)`** in `src/lib/permissions/` — used in server actions and UI to check what the current user is allowed to do before attempting a write.

```ts
const policy = createPolicy(ctx.role)
if (!policy.can('manage:members')) return { error: 'Forbidden' }
```

Available actions are defined in `src/lib/permissions/actions.ts`.

---

## Data fetching

Data is fetched in **React Server Components** (page files) using the server Supabase client. The result is passed as props to client components.

For client-side state that needs to stay fresh (e.g. after a mutation), use **React Query hooks** in `src/lib/hooks/`. Each hook has a query key; mutations call `invalidateRelated()` to bust the right caches.

---

## Routing

All org-scoped pages live under `/orgs/[slug]/`. The `[slug]` segment is the org's URL slug (e.g. `/orgs/acme-corp/assets`).

Route groups (the `(name)` folders) are invisible in the URL — they just group layouts:

- `(app)` — authenticated layout with nav sidebar
- `(auth)` — unauthenticated layout (centered card)
- `(onboarding)` — wizard layout

---

## Where to put new things

| What                    | Where                                                         |
| ----------------------- | ------------------------------------------------------------- |
| New page                | `src/app/(app)/orgs/[slug]/<feature>/page.tsx`                |
| New mutation            | `src/app/actions/<domain>.ts`                                 |
| New Zod schema / type   | `src/lib/types/`                                              |
| New reusable component  | `src/components/`                                             |
| New data-fetching hook  | `src/lib/hooks/`                                              |
| New DB migration        | `supabase/migrations/` (numbered, e.g. `011_your_change.sql`) |
| New domain logic (pure) | `src/lib/<domain>/domain.ts` with ports + adapter pattern     |

---

## Conventions

- **TypeScript strict** — no `any`, no implicit returns on server actions.
- **Server actions return `{ error: string } | { error: null } | null`** — `null` means success.
- **No Supabase calls in components** — all DB access goes through server actions or RSC page files.
- **Conventional commits** — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` prefixes.
- **Pre-commit hooks** run lint + type-check + tests automatically (via husky). Fix failures before committing.
- **One migration per PR** — keep migrations small and focused; never edit a migration that's already been applied to production.

---

## Key files to read first

1. `src/app/actions/_context.ts` — understand how auth + org context works
2. `src/app/actions/_audit.ts` — audit trail pattern
3. `src/lib/permissions/index.ts` — permission policy
4. `src/lib/types/index.ts` — shared Zod schemas and types
