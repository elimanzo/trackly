-- ============================================================
-- service_role table/schema grants
--
-- Migration 019 re-granted the implicit Supabase baseline
-- privileges to `anon` and `authenticated`, but omitted
-- `service_role`. The app's admin client (createAdminClient)
-- connects as service_role and is used by getContext() to
-- resolve the org + membership on every server action. With no
-- DML privileges, those reads failed with:
--
--   42501  permission denied for table organizations
--
-- getContext() then returned null and every write surfaced as
-- "Not authenticated" — even for owners.
--
-- service_role bypasses RLS by design, so these grants restore
-- the intended admin-client access. Mirror 019 for service_role.
-- ============================================================

grant usage on schema public to service_role;

grant select, insert, update, delete
  on all tables in schema public
  to service_role;

grant usage, select
  on all sequences in schema public
  to service_role;

-- Apply the same defaults to any tables/sequences created later.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to service_role;
