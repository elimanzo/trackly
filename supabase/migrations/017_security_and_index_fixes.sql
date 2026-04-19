-- ============================================================
-- Security hardening and missing index fixes
--
--  1. Revoke EXECUTE on soft_delete_with_cascade from public
--     (security definer fn, was callable by any authenticated
--     user — bypasses RLS entirely)
--
--  2. Drop audit_logs INSERT RLS policy — all legitimate writes
--     go through the admin/service_role client. Keeping the
--     policy lets any org member fabricate audit entries via
--     the browser client directly.
--
--  3. Partial index on assets(warranty_expiry) — dashboard
--     warranty alert query was doing a seq scan.
--
--  4. Partial index on assets(status) — useAssets status filter
--     had no dedicated index.
-- ============================================================

-- ============================================================
-- 1. Lock down soft_delete_with_cascade (CRITICAL)
--
-- Migration 008 created this security definer function but
-- never restricted callers. Postgres grants EXECUTE to PUBLIC
-- by default, so any authenticated user could call it via RPC
-- and soft-delete any entity, bypassing RLS.
--
-- The app calls this exclusively via ctx.admin (service_role),
-- so revoking from authenticated has no functional impact.
-- ============================================================

revoke all on function public.soft_delete_with_cascade(text, uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.soft_delete_with_cascade(text, uuid, uuid, text)
  to service_role;

-- ============================================================
-- 2. Drop audit_logs INSERT RLS policy (HIGH)
--
-- The policy allowed any org member to insert arbitrary rows
-- (any actor, action, entity) directly via the browser client.
-- All app writes go through the admin client which bypasses
-- RLS — so service_role inserts are unaffected by this drop.
-- ============================================================

drop policy if exists "authenticated users can insert audit logs" on public.audit_logs;

-- ============================================================
-- 3. Partial index on assets(warranty_expiry) (MEDIUM)
--
-- Dashboard warranty alert query:
--   WHERE warranty_expiry <= $date AND deleted_at IS NULL
-- Previously seq-scanned the full assets table.
-- ============================================================

create index if not exists assets_warranty_expiry_idx
  on public.assets (warranty_expiry)
  where deleted_at is null
    and warranty_expiry is not null;

-- ============================================================
-- 4. Partial index on assets(status) (MEDIUM)
--
-- useAssets status filter is not covered by the existing
-- org_id partial index. Composite with org_id covers the
-- common query pattern: WHERE org_id = $1 AND status = $2.
-- ============================================================

create index if not exists assets_org_id_status_idx
  on public.assets (org_id, status)
  where deleted_at is null;
