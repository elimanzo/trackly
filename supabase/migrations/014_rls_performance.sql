-- ============================================================
-- RLS policy performance pass
--
-- Two classes of fixes applied to every policy:
--
--  1. Wrap stable helper functions in (select ...) so Postgres
--     evaluates them as InitPlans (once per query) rather than
--     once per row.
--
--     Before: org_id = any(public.get_my_org_ids())
--     After:  org_id = any(public.get_my_org_ids())
--
--  2. Replace has_department_access(department_id) — which
--     executed a user_departments lookup for every distinct
--     department_id in the result set (N+1 at DB level) — with
--     a single non-correlated subquery that fetches the user's
--     allowed department IDs once per query.
--
-- Migration 013 applied fix #1 only to asset_assignments.
-- This migration extends it to all remaining tables.
-- ============================================================

-- ============================================================
-- organizations
-- ============================================================

drop policy if exists "members can view their orgs"    on public.organizations;
drop policy if exists "owner or admin can update org"  on public.organizations;

create policy "members can view their orgs"
  on public.organizations for select
  using (id = any(public.get_my_org_ids()));

create policy "owner or admin can update org"
  on public.organizations for update
  using (
    id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(id)) in ('owner', 'admin')
  );

-- ============================================================
-- profiles
-- ============================================================

drop policy if exists "users can view profiles in their orgs" on public.profiles;

create policy "users can view profiles in their orgs"
  on public.profiles for select
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.user_org_memberships m
      where m.user_id = profiles.id
        and m.org_id = any(public.get_my_org_ids())
    )
  );

-- ============================================================
-- user_org_memberships
-- ============================================================

drop policy if exists "users can view own and org memberships" on public.user_org_memberships;
drop policy if exists "admin/owner can manage memberships"      on public.user_org_memberships;

create policy "users can view own and org memberships"
  on public.user_org_memberships for select
  using (
    user_id = (select auth.uid())
    or org_id = any(public.get_my_org_ids())
  );

create policy "admin/owner can manage memberships"
  on public.user_org_memberships for all
  using (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
  );

-- ============================================================
-- departments
-- ============================================================

drop policy if exists "org members can view departments"   on public.departments;
drop policy if exists "admin/owner can manage departments" on public.departments;

create policy "org members can view departments"
  on public.departments for select
  using (org_id = any(public.get_my_org_ids()));

create policy "admin/owner can manage departments"
  on public.departments for all
  using (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
  );

-- ============================================================
-- user_departments
-- ============================================================

drop policy if exists "org members can view user_departments"   on public.user_departments;
drop policy if exists "admin/owner can manage user_departments" on public.user_departments;

create policy "org members can view user_departments"
  on public.user_departments for select
  using (org_id = any(public.get_my_org_ids()));

create policy "admin/owner can manage user_departments"
  on public.user_departments for all
  using (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
  );

-- ============================================================
-- categories
-- ============================================================

drop policy if exists "org members can view categories"   on public.categories;
drop policy if exists "admin/owner can manage categories" on public.categories;

create policy "org members can view categories"
  on public.categories for select
  using (org_id = any(public.get_my_org_ids()));

create policy "admin/owner can manage categories"
  on public.categories for all
  using (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
  );

-- ============================================================
-- locations
-- ============================================================

drop policy if exists "org members can view locations"   on public.locations;
drop policy if exists "admin/owner can manage locations" on public.locations;

create policy "org members can view locations"
  on public.locations for select
  using (org_id = any(public.get_my_org_ids()));

create policy "admin/owner can manage locations"
  on public.locations for all
  using (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
  );

-- ============================================================
-- vendors
-- ============================================================

drop policy if exists "org members can view vendors"   on public.vendors;
drop policy if exists "admin/owner can manage vendors" on public.vendors;

create policy "org members can view vendors"
  on public.vendors for select
  using (org_id = any(public.get_my_org_ids()));

create policy "admin/owner can manage vendors"
  on public.vendors for all
  using (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
  );

-- ============================================================
-- assets
--
-- SELECT: replaces has_department_access(department_id) with a
-- single non-correlated subquery. The subquery has no outer
-- column references so Postgres materialises it as an InitPlan
-- (executed once per query, not once per row).
--
-- UPDATE: same department fix; also wraps get_my_role_in_org
-- which was previously called twice per row.
-- ============================================================

drop policy if exists "org members can view their assets"        on public.assets;
drop policy if exists "editor+ can insert assets"                on public.assets;
drop policy if exists "editor+ can update assets in their scope" on public.assets;
drop policy if exists "admin/owner can delete assets"            on public.assets;

create policy "org members can view their assets"
  on public.assets for select
  using (
    org_id = any(public.get_my_org_ids())
    and deleted_at is null
    and (
      (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
      or department_id = any(
          select ud.department_id
          from public.user_departments ud
          where ud.user_id = (select auth.uid())
            and ud.org_id  = any(public.get_my_org_ids())
      )
    )
  );

create policy "editor+ can insert assets"
  on public.assets for insert
  with check (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin', 'editor')
  );

create policy "editor+ can update assets in their scope"
  on public.assets for update
  using (
    org_id = any(public.get_my_org_ids())
    and (
      (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
      or (
        (select public.get_my_role_in_org(org_id)) = 'editor'
        and department_id = any(
            select ud.department_id
            from public.user_departments ud
            where ud.user_id = (select auth.uid())
              and ud.org_id  = any(public.get_my_org_ids())
        )
      )
    )
  );

create policy "admin/owner can delete assets"
  on public.assets for delete
  using (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
  );

-- ============================================================
-- asset_assignments
-- SELECT policy — wraps get_my_org_ids (ALL policy already
-- fixed in migration 013).
-- ============================================================

drop policy if exists "org members can view assignments" on public.asset_assignments;

create policy "org members can view assignments"
  on public.asset_assignments for select
  using (
    exists (
      select 1 from public.assets a
      where a.id     = asset_assignments.asset_id
        and a.org_id = any(public.get_my_org_ids())
    )
  );

-- ============================================================
-- invites
-- ============================================================

drop policy if exists "admin/owner can view invites"   on public.invites;
drop policy if exists "admin/owner can create invites" on public.invites;
drop policy if exists "admin/owner can update invites" on public.invites;

create policy "admin/owner can view invites"
  on public.invites for select
  using (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
  );

create policy "admin/owner can create invites"
  on public.invites for insert
  with check (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
  );

create policy "admin/owner can update invites"
  on public.invites for update
  using (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin')
  );

-- ============================================================
-- audit_logs
-- ============================================================

drop policy if exists "org members can view audit logs"          on public.audit_logs;
drop policy if exists "authenticated users can insert audit logs" on public.audit_logs;

create policy "org members can view audit logs"
  on public.audit_logs for select
  using (org_id = any(public.get_my_org_ids()));

create policy "authenticated users can insert audit logs"
  on public.audit_logs for insert
  with check (org_id = any(public.get_my_org_ids()));

-- ============================================================
-- maintenance_events
-- ============================================================

drop policy if exists "org members can view maintenance events"  on public.maintenance_events;
drop policy if exists "editor+ can insert maintenance events"    on public.maintenance_events;
drop policy if exists "editor+ can update maintenance events"    on public.maintenance_events;

create policy "org members can view maintenance events"
  on public.maintenance_events for select
  using (
    org_id = any(public.get_my_org_ids())
    and deleted_at is null
  );

create policy "editor+ can insert maintenance events"
  on public.maintenance_events for insert
  with check (
    org_id = any(public.get_my_org_ids())
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin', 'editor')
  );

create policy "editor+ can update maintenance events"
  on public.maintenance_events for update
  using (
    org_id = any(public.get_my_org_ids())
    and deleted_at is null
    and (select public.get_my_role_in_org(org_id)) in ('owner', 'admin', 'editor')
  );
