# Supabase keep-warm cron

`.github/workflows/keep-warm.yml` pings the production Supabase project every 3 days via a lightweight
REST API call. This keeps the project active and prevents the Supabase free-tier 7-day idle pause.

## Why this exists

Supabase free-tier projects pause after 7 days of inactivity. The first request after a pause triggers
a cold resume that can take 20–30 seconds. Per [ADR 0001](adr/0001-supabase-keep-warm.md), a scheduled
ping is the chosen solution instead of upgrading to paid always-on compute.

## Secrets required

| Secret                      | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `SUPABASE_URL`              | Production project URL (`https://<project-ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (project Settings → API)                    |

## Removing this cron

Deleting or disabling `keep-warm.yml` reintroduces cold starts after any 7-day quiet stretch
(weekends, holidays, low-traffic periods).
