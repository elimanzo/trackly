# Stay on Supabase free tier; fix perceived slowness in code, not by upgrading

## Status

accepted

## Context

Production felt slow app-wide: "endless loading" and needing to click a nav link
multiple times before a page appeared. Investigation found two distinct causes:

1. **Idle pause** — the Supabase free tier pauses a project after ~7 days of
   inactivity. The first load after a quiet stretch pays a cold-resume penalty.
2. **Per-navigation waterfall** — every client-side navigation re-runs the
   auth → org → departments → data chain _sequentially_, `proxy.ts` fires 5
   sequential DB queries per nav, no shell data (org/memberships) is cached
   across navigations, and the whole UI is gated behind a single loading spinner.
   On the free tier's Nano instance (0.5 GB RAM, shared CPU) this reads as "slow
   on every click."

Rate-limit 429s and connection-pool exhaustion were considered and **ruled out**
for now: they require many concurrent clients, and the observed slowness was with
a single user. They return as a concern once the app is genuinely multi-user.

## Decision

Stay on the free tier (no budget for Supabase Pro at ~$25/mo) and treat the
slowness as a code and operations problem rather than a compute problem:

- A **keep-warm cron** (GitHub Action pinging the DB every few days) prevents the
  7-day idle pause, eliminating the cold start without paying for Pro's
  always-on compute.
- **Parallelize** independent startup queries (`Promise.all`); **collapse** only
  the genuinely dependent slug → org → membership chain in `proxy.ts` into a
  single query/RPC. This keeps query functions modular while cutting round-trips.
- **Cache shell data** (org, memberships) across navigations so clicks stop
  refetching, and stop gating the entire UI on one spinner.

## Considered Options

- **Upgrade to Supabase Pro.** Removes idle pause and raises compute. Rejected:
  no budget. Revisit when funded or when user count makes free-tier caps
  (realtime connection limits, auth token-refresh 429s) the binding constraint.
- **Collapse all queries into SQL/RPC.** Fewest round-trips, but moves logic into
  the database and reduces modularity/testability. Rejected as the default;
  reserved for the dependent chain only.

## Consequences

- The keep-warm cron must keep running; if it's removed or the Action breaks, the
  idle pause (and cold start) returns silently.
- These fixes also reduce per-user DB load, so they help the coming multi-user
  case — but full multi-user hardening (realtime limits, auth rate limits at
  scale) is a deliberate deferred follow-up, not covered here.
- Deeper query tuning (`select *` trimming, bounding the asset-assignments join,
  indexes) is also deferred as follow-up.
