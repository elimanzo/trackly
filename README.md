# Asset Tracker

A multi-tenant SaaS app for tracking physical assets across departments — built with Next.js, Supabase, and Tailwind.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Database / Auth:** Supabase (Postgres + RLS + Realtime)
- **UI:** Tailwind CSS + shadcn/ui
- **State:** React Query + React Context
- **Deployment:** Vercel + Supabase

## Roles

| Role   | Access                                             |
| ------ | -------------------------------------------------- |
| Owner  | Full org control, settings, user management        |
| Admin  | Full asset + user management org-wide              |
| Editor | CRUD on assets within assigned departments         |
| Viewer | Read-only + CSV export within assigned departments |

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
git clone git@github.com:elimanzo/asset-tracker.git
cd asset-tracker
pnpm install

# 2. Set up environment variables
cp .env.local.example .env.local

# 3. Start the local Supabase stack (requires Docker)
pnpm db:start

# 4. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seeded accounts

All passwords: `Dev1234!`

| Email           | Name           | Role   | Department access |
| --------------- | -------------- | ------ | ----------------- |
| owner@acme.dev  | Alex Rivera    | Owner  | All               |
| admin@acme.dev  | Sarah Mitchell | Admin  | All               |
| editor@acme.dev | James Thornton | Editor | IT, Operations    |
| viewer@acme.dev | Maria Chen     | Viewer | Finance, HR       |

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

---

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Protected app routes (dashboard, assets, etc.)
│   ├── (onboarding)/   # Org creation wizard
│   ├── (auth)/         # Login, signup
│   └── actions/        # Server actions (all mutations)
├── components/         # UI components
├── lib/
│   ├── hooks/          # React Query data hooks
│   ├── supabase/       # Supabase client factories (browser/server/admin)
│   └── types/          # Zod schemas + TypeScript types
└── providers/          # React context providers (Auth, OrgData, Onboarding)

supabase/
├── migrations/         # Incremental schema migrations (applied in order)
└── seeds/              # Dev seed data (users, org, assets)
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
pnpm type-check     # TypeScript check
```

Tests live alongside the code they cover in `__tests__/` directories:

- `src/lib/utils/__tests__/` — pure utility functions (permissions, formatters, csv-export)
- `src/app/actions/__tests__/` — server actions with Supabase mocked at the boundary

Pre-commit hooks run lint, type-check, and the full test suite automatically.

---

## Git workflow

- `main` — production (auto-deploys to Vercel)
- `feat/*` — feature branches, PR into `main`

---

## Environment variables

| Variable                        | Description                                       |
| ------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe to expose)                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (server-side only, never expose) |

Local values are pre-filled in `.env.local.example` — they're the same for every developer and only work against the local Docker stack.
