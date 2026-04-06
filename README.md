# Trackly

A multi-tenant SaaS app for tracking physical assets across departments — built with Next.js, Supabase, and Tailwind.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Database / Auth:** Supabase (Postgres + RLS + Realtime)
- **UI:** Tailwind CSS + shadcn/ui
- **State:** React Query + React Context
- **Deployment:** Vercel + Supabase

## Roles

| Role   | Access                                      |
| ------ | ------------------------------------------- |
| Owner  | Full org control, settings, user management |
| Admin  | Full asset + user management org-wide       |
| Editor | CRUD on assets within assigned departments  |
| Viewer | Read-only within assigned departments       |

---

## Local Development

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — required for the local Supabase stack
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) — `brew install supabase/tap/supabase`

### Setup

```bash
# 1. Clone and install dependencies
git clone git@github.com:elimanzo/trackly.git
cd trackly
pnpm install

# 2. Start the local Supabase stack (requires Docker)
pnpm db:start

# 3. Copy the example env file and fill in values from `supabase status`
cp .env.local.example .env.local

# 4. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The anon key and service role key are printed by `supabase status` after the stack starts. The URL is always `http://127.0.0.1:54321`.

### Seeded accounts

All passwords: `Dev1234!`

**Acme Corp** (`acme-corp`) — full dataset, 50+ assets across 5 departments

| Email           | Name           | Acme Corp role | Department access |
| --------------- | -------------- | -------------- | ----------------- |
| owner@acme.dev  | Alex Rivera    | Owner          | All               |
| admin@acme.dev  | Sarah Mitchell | Admin          | All               |
| editor@acme.dev | James Thornton | Editor         | IT, Operations    |
| viewer@acme.dev | Maria Chen     | Viewer         | Finance, HR       |

**Multi-org memberships** (seed 003 — multi-org edge cases)

| Email           | Name           | TechFlow Inc   | Meridian Labs | Solo Ventures |
| --------------- | -------------- | -------------- | ------------- | ------------- |
| owner@acme.dev  | Alex Rivera    | Editor         | —             | —             |
| admin@acme.dev  | Sarah Mitchell | —              | Owner         | —             |
| editor@acme.dev | James Thornton | Owner          | Editor        | —             |
| viewer@acme.dev | Maria Chen     | Pending invite | —             | —             |

**Additional seed accounts**

| Email              | Name       | State                                          |
| ------------------ | ---------- | ---------------------------------------------- |
| newuser@dev.test   | Dana Park  | No org — lands on onboarding                   |
| soleowner@dev.test | Frank Sole | Sole owner of Solo Ventures (no other members) |

### Local services

| Service         | URL                    | Description           |
| --------------- | ---------------------- | --------------------- |
| App             | http://localhost:3000  | Next.js dev server    |
| Supabase Studio | http://localhost:54323 | Database GUI          |
| Mailpit         | http://localhost:54324 | Catch-all email inbox |

### Database scripts

```bash
pnpm db:start    # Start the local Supabase stack
pnpm db:stop     # Stop the local Supabase stack
pnpm db:reset    # Wipe DB, re-apply all migrations, re-run seeds
pnpm db:studio   # Open Supabase Studio in browser
pnpm db:email    # Open Mailpit (local email inbox) in browser
```

`pnpm db:reset` is the main command for development — use it any time you want a clean slate with fresh seed data.

### Google OAuth (optional for local dev)

To test Google sign-in locally:

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `http://localhost:54321/auth/v1/callback`
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local`

Google sign-in is not required to run the app locally — email/password auth works without it.

---

## Project Structure

```
src/
├── app/
│   ├── (app)/
│   │   └── orgs/
│   │       ├── page.tsx          # Org picker (auto-redirects for single-org users)
│   │       └── [slug]/           # Org-scoped routes — all pages live here
│   │           ├── dashboard/
│   │           ├── assets/
│   │           ├── settings/
│   │           └── ...
│   ├── (onboarding)/   # Org creation wizard (/org/new, /setup/*)
│   ├── (auth)/         # Login, signup, invite accept/confirm, password reset
│   ├── actions/        # Server actions (all mutations go here)
│   └── auth/           # OAuth callback handler
├── components/         # Shared UI components
├── lib/
│   ├── hooks/          # React Query data hooks + cache invalidation graph
│   ├── permissions/    # Permission policy (createPolicy, action vocabulary)
│   ├── supabase/       # Supabase client factories (browser / server / admin)
│   └── types/          # Zod schemas + TypeScript types
└── providers/
    ├── AuthProvider    # Session + user profile (memberships across all orgs)
    ├── OrgProvider     # Active org context — scoped to the current [slug]
    └── OnboardingProvider  # Wizard state for org creation flow

supabase/
├── migrations/         # Incremental schema migrations (applied in order)
├── seeds/              # Dev seed data
│   ├── 001_initial_data.sql  # 4 users, Acme Corp, 50+ assets
│   ├── 002_bulk_items.sql    # Bulk/consumable assets
│   └── 003_multi_org.sql     # Multi-org edge cases (3 extra orgs, 6 users)
└── templates/          # Custom Supabase email templates
```

## Adding a migration

```bash
# Create a new numbered migration file
touch supabase/migrations/010_your_change.sql

# Edit the file, then apply it to your local DB
pnpm db:reset
```

Migrations in `supabase/migrations/` are applied in filename order on every `db:reset`.

---

## Testing

```bash
pnpm test           # Run all tests (vitest)
pnpm type-check     # TypeScript strict check
```

Tests live alongside the code they cover in `__tests__/` directories:

- `src/lib/utils/__tests__/` — pure utility functions (availability, asset tags)
- `src/lib/permissions/__tests__/` — permission policy (enforce, queryConstraint)
- `src/lib/hooks/__tests__/` — cache invalidation graph
- `src/app/actions/__tests__/` — server actions (Supabase mocked at the boundary)

Pre-commit hooks run lint, type-check, and the full test suite automatically.

---

## Git workflow

- `main` — production (auto-deploys to Vercel)
- `feat/multi-org` — multi-org integration branch; feature branches PR here first
- `feat/*` — feature branches, PR into `feat/multi-org` or `main`

---

## Environment variables

| Variable                        | Required   | Description                                       |
| ------------------------------- | ---------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes        | Supabase project URL                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes        | Public anon key (safe to expose)                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes        | Service role key (server-side only, never expose) |
| `NEXT_PUBLIC_APP_URL`           | Yes        | App origin (e.g. `https://trackly.vercel.app`)    |
| `GOOGLE_CLIENT_ID`              | OAuth only | Google OAuth client ID                            |
| `GOOGLE_CLIENT_SECRET`          | OAuth only | Google OAuth client secret                        |

Local values are documented in `.env.local.example`. The Supabase keys for local dev are printed by `supabase status`.
