-- ============================================================
-- Explicit table/schema grants for anon + authenticated
--
-- The app relied on Supabase's *implicit* baseline grants (the
-- default privileges Supabase applies to the `public` schema at
-- DB init). Those are not reproduced by our migrations, so on
-- machines where the baseline never applied — older Docker
-- volumes, a different CLI version, a rebuilt DB — the roles end
-- up with NO table privileges. Every read then fails with:
--
--   42501  permission denied for table profiles
--
-- ...even a pre-login anon request, because the role can't touch
-- the table at all. `supabase db reset` did not fix it: the
-- baseline is applied by the platform init, not by our migrations.
--
-- This migration grants the privileges explicitly so every
-- environment is identical. RLS remains the actual access gate —
-- these grants only get the roles "in the door"; row visibility
-- is still decided by the policies on each table.
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on all tables in schema public
  to anon, authenticated;

grant usage, select
  on all sequences in schema public
  to anon, authenticated;

-- Apply the same defaults to any tables/sequences created later,
-- so future migrations don't reintroduce the drift.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
