-- ============================================================
-- Database optimizations — indexes, RLS performance, and
-- statement timeouts.
--
-- Covers all findings from the Supabase/Postgres best-practices
-- audit (April 2026):
--
--  CRITICAL
--    1. Missing indexes on foreign key columns
--    2. RLS per-row function call on asset_assignments
--
--  HIGH
--    3. audit_logs missing (org_id, created_at) index for
--       time-range queries (dashboard activity, asset history)
--    4. Missing indexes on asset_assignments.location_id /
--       .department_id (added in 005 but never indexed)
--
--  MEDIUM
--    5. Composite index for audit_logs entity lookups
--
--  LOW
--    6. Statement timeout for long-running operations
-- ============================================================

-- ============================================================
-- 1. Missing FK indexes (CRITICAL)
-- ============================================================

-- assets
create index if not exists assets_category_id_idx
  on public.assets (category_id) where deleted_at is null;

create index if not exists assets_location_id_idx
  on public.assets (location_id) where deleted_at is null;

create index if not exists assets_vendor_id_idx
  on public.assets (vendor_id) where deleted_at is null;

create index if not exists assets_created_by_idx
  on public.assets (created_by) where deleted_at is null;

create index if not exists assets_updated_by_idx
  on public.assets (updated_by) where deleted_at is null;

-- asset_assignments
create index if not exists asset_assignments_assigned_to_user_id_idx
  on public.asset_assignments (assigned_to_user_id);

create index if not exists asset_assignments_assigned_by_idx
  on public.asset_assignments (assigned_by);

-- invites
create index if not exists invites_invited_by_idx
  on public.invites (invited_by);

-- audit_logs
create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id);

-- user_org_memberships
create index if not exists user_org_memberships_user_id_idx
  on public.user_org_memberships (user_id);

-- user_departments
create index if not exists user_departments_user_id_idx
  on public.user_departments (user_id);

-- maintenance_events
create index if not exists maintenance_events_created_by_idx
  on public.maintenance_events (created_by) where deleted_at is null;

-- ============================================================
-- 2. Fix RLS per-row function call on asset_assignments (CRITICAL)
--
-- get_my_role_in_org(a.org_id) inside EXISTS is evaluated once
-- per row. Wrapping it in (select ...) tells Postgres to evaluate
-- it once per query as an InitPlan.
-- ============================================================

drop policy if exists "editor+ can manage assignments" on public.asset_assignments;

create policy "editor+ can manage assignments"
  on public.asset_assignments for all
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_assignments.asset_id
        and a.org_id = any(public.get_my_org_ids())
        and (select public.get_my_role_in_org(a.org_id)) in ('owner', 'admin', 'editor')
    )
  );

-- ============================================================
-- 3. audit_logs time-range index (HIGH)
--
-- Used by: dashboard recent-activity count, useAssetHistory,
-- useRecentActivity — all filter by org_id + time range and
-- order by created_at DESC.
-- ============================================================

create index if not exists audit_logs_org_id_created_at_idx
  on public.audit_logs (org_id, created_at desc);

-- ============================================================
-- 4. asset_assignments FK indexes for columns added in 005 (HIGH)
-- ============================================================

create index if not exists asset_assignments_department_id_idx
  on public.asset_assignments (department_id);

create index if not exists asset_assignments_location_id_idx
  on public.asset_assignments (location_id);

-- ============================================================
-- 5. Composite index for audit_logs entity lookups (MEDIUM)
--
-- Queries on a specific asset's history filter by both org_id
-- and entity_id. The existing (org_id, entity_id) index is fine
-- for that, but adding entity_id alone covers cases where
-- entity_id is queried independently (e.g. cross-org lookups
-- via admin client).
-- ============================================================

create index if not exists audit_logs_entity_id_idx
  on public.audit_logs (entity_id);

-- ============================================================
-- 6. Statement timeout (LOW)
--
-- Prevents runaway queries from holding locks indefinitely.
-- 10s is generous for an app with no bulk operations — adjust
-- per-transaction if a specific operation needs more time.
-- Applied at the database level so it covers all roles.
-- ============================================================

alter database postgres set statement_timeout = '10s';
