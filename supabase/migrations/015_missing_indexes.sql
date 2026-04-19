-- ============================================================
-- Missing indexes
--
--  1. Trigram GIN indexes on categories/locations/vendors name
--     columns — used in search_asset_ids ILIKE joins but
--     previously unindexed (seq scan on every search).
--
--  2. Partial index on invites(org_id) — RLS policies filter
--     invites by org_id but no index existed.
--
--  3. Partial index on asset_assignments(asset_id) for active
--     (returned_at IS NULL) assignments — the hot path for
--     active checkout queries.
--
--  4. Autovacuum tuning for insert-only / high-churn tables.
-- ============================================================

-- ============================================================
-- 1. Trigram indexes for search_asset_ids joins (HIGH)
-- ============================================================

create index if not exists categories_name_trgm_idx
  on public.categories using gin (name gin_trgm_ops);

create index if not exists locations_name_trgm_idx
  on public.locations using gin (name gin_trgm_ops);

create index if not exists vendors_name_trgm_idx
  on public.vendors using gin (name gin_trgm_ops);

-- ============================================================
-- 2. Partial index on invites(org_id) (HIGH)
--
-- RLS select/insert/update policies all filter by org_id.
-- Scoping to accepted_at IS NULL covers the common case
-- (pending invites are what admins query).
-- ============================================================

create index if not exists invites_org_id_idx
  on public.invites (org_id)
  where accepted_at is null;

-- ============================================================
-- 3. Partial index for active asset assignments (HIGH)
--
-- The asset detail query fetches all assignments per asset
-- and filters returned_at IS NULL in the JS layer. An index
-- here lets Postgres filter server-side and supports future
-- queries that target only active checkouts.
-- ============================================================

create index if not exists asset_assignments_active_idx
  on public.asset_assignments (asset_id)
  where returned_at is null;

-- ============================================================
-- 4. Autovacuum tuning for high-growth tables (MEDIUM)
--
-- audit_logs and asset_assignments are insert-only — they never
-- accumulate dead tuples that need vacuuming. The only thing
-- autovacuum needs to do is ANALYZE as they grow so the planner
-- stays accurate. Lower the analyze threshold from the 10%
-- default so stats stay fresh on large orgs.
-- ============================================================

alter table public.audit_logs set (
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold    = 1000
);

alter table public.asset_assignments set (
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold    = 500
);
