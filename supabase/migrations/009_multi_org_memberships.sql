-- ============================================================
-- Multi-org membership
-- Replace profiles.org_id / profiles.role / profiles.invite_status
-- with a user_org_memberships join table so one account can belong
-- to many organisations with independent roles.
-- ============================================================

-- ============================================================
-- 1. Create user_org_memberships join table
-- ============================================================

create table public.user_org_memberships (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  org_id        uuid not null references public.organizations (id) on delete cascade,
  role          public.user_role not null default 'viewer',
  invite_status public.invite_status not null default 'pending',
  created_at    timestamptz not null default now(),
  primary key (user_id, org_id)
);

create index on public.user_org_memberships (org_id);

alter table public.user_org_memberships enable row level security;

-- ============================================================
-- 2. Migrate existing single-org memberships from profiles
-- ============================================================

insert into public.user_org_memberships (user_id, org_id, role, invite_status, created_at)
select id, org_id, role, invite_status, created_at
from public.profiles
where org_id is not null;

-- ============================================================
-- 3. Add denormalized org_id to user_departments for RLS efficiency
-- ============================================================

alter table public.user_departments
  add column org_id uuid references public.organizations (id) on delete cascade;

update public.user_departments ud
set org_id = d.org_id
from public.departments d
where d.id = ud.department_id;

alter table public.user_departments
  alter column org_id set not null;

create index on public.user_departments (org_id);

-- ============================================================
-- 4. Drop RLS policies that reference get_my_org_id() / get_my_role()
-- ============================================================

drop policy if exists "members can view their org" on public.organizations;
drop policy if exists "owner or admin can update org" on public.organizations;

drop policy if exists "users can view profiles in their org" on public.profiles;
drop policy if exists "admin/owner can update profiles in org" on public.profiles;

drop policy if exists "org members can view departments" on public.departments;
drop policy if exists "admin/owner can manage departments" on public.departments;

drop policy if exists "org members can view user_departments" on public.user_departments;
drop policy if exists "admin/owner can manage user_departments" on public.user_departments;

drop policy if exists "org members can view categories" on public.categories;
drop policy if exists "admin/owner can manage categories" on public.categories;

drop policy if exists "org members can view locations" on public.locations;
drop policy if exists "admin/owner can manage locations" on public.locations;

drop policy if exists "org members can view vendors" on public.vendors;
drop policy if exists "admin/owner can manage vendors" on public.vendors;

drop policy if exists "org members can view their assets" on public.assets;
drop policy if exists "editor+ can insert assets" on public.assets;
drop policy if exists "editor+ can update assets in their scope" on public.assets;
drop policy if exists "admin/owner can delete assets" on public.assets;

drop policy if exists "org members can view assignments" on public.asset_assignments;
drop policy if exists "editor+ can manage assignments" on public.asset_assignments;

drop policy if exists "admin/owner can view invites" on public.invites;
drop policy if exists "admin/owner can create invites" on public.invites;
drop policy if exists "admin/owner can update invites" on public.invites;

drop policy if exists "org members can view audit logs" on public.audit_logs;
drop policy if exists "authenticated users can insert audit logs" on public.audit_logs;

-- ============================================================
-- 5. Drop old single-org helper functions
-- ============================================================

drop function if exists public.get_my_org_id();
drop function if exists public.get_my_role();

-- ============================================================
-- 6. New helper functions
-- ============================================================

create or replace function public.get_my_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(org_id), '{}')
  from public.user_org_memberships
  where user_id = (select auth.uid())
$$;

-- Returns the caller's role within a specific org (null if not a member)
create or replace function public.get_my_role_in_org(p_org_id uuid)
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_org_memberships
  where user_id = (select auth.uid()) and org_id = p_org_id
$$;

-- ============================================================
-- 7. Recreate RLS policies using the new helpers
-- ============================================================

-- user_org_memberships ----------------------------------------

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
    and public.get_my_role_in_org(org_id) in ('owner', 'admin')
  );

-- organizations -----------------------------------------------

create policy "members can view their orgs"
  on public.organizations for select
  using (id = any(public.get_my_org_ids()));

create policy "owner or admin can update org"
  on public.organizations for update
  using (
    id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(id) in ('owner', 'admin')
  );

-- profiles ----------------------------------------------------

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

-- departments -------------------------------------------------

create policy "org members can view departments"
  on public.departments for select
  using (org_id = any(public.get_my_org_ids()));

create policy "admin/owner can manage departments"
  on public.departments for all
  using (
    org_id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(org_id) in ('owner', 'admin')
  );

-- user_departments --------------------------------------------

create policy "org members can view user_departments"
  on public.user_departments for select
  using (org_id = any(public.get_my_org_ids()));

create policy "admin/owner can manage user_departments"
  on public.user_departments for all
  using (
    org_id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(org_id) in ('owner', 'admin')
  );

-- categories --------------------------------------------------

create policy "org members can view categories"
  on public.categories for select
  using (org_id = any(public.get_my_org_ids()));

create policy "admin/owner can manage categories"
  on public.categories for all
  using (
    org_id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(org_id) in ('owner', 'admin')
  );

-- locations ---------------------------------------------------

create policy "org members can view locations"
  on public.locations for select
  using (org_id = any(public.get_my_org_ids()));

create policy "admin/owner can manage locations"
  on public.locations for all
  using (
    org_id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(org_id) in ('owner', 'admin')
  );

-- vendors -----------------------------------------------------

create policy "org members can view vendors"
  on public.vendors for select
  using (org_id = any(public.get_my_org_ids()));

create policy "admin/owner can manage vendors"
  on public.vendors for all
  using (
    org_id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(org_id) in ('owner', 'admin')
  );

-- assets ------------------------------------------------------

create policy "org members can view their assets"
  on public.assets for select
  using (
    org_id = any(public.get_my_org_ids())
    and deleted_at is null
    and (
      public.get_my_role_in_org(org_id) in ('owner', 'admin')
      or public.has_department_access(assets.department_id)
    )
  );

create policy "editor+ can insert assets"
  on public.assets for insert
  with check (
    org_id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(org_id) in ('owner', 'admin', 'editor')
  );

create policy "editor+ can update assets in their scope"
  on public.assets for update
  using (
    org_id = any(public.get_my_org_ids())
    and (
      public.get_my_role_in_org(org_id) in ('owner', 'admin')
      or (
        public.get_my_role_in_org(org_id) = 'editor'
        and public.has_department_access(assets.department_id)
      )
    )
  );

create policy "admin/owner can delete assets"
  on public.assets for delete
  using (
    org_id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(org_id) in ('owner', 'admin')
  );

-- asset_assignments -------------------------------------------

create policy "org members can view assignments"
  on public.asset_assignments for select
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_assignments.asset_id
        and a.org_id = any(public.get_my_org_ids())
    )
  );

create policy "editor+ can manage assignments"
  on public.asset_assignments for all
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_assignments.asset_id
        and a.org_id = any(public.get_my_org_ids())
        and public.get_my_role_in_org(a.org_id) in ('owner', 'admin', 'editor')
    )
  );

-- invites -----------------------------------------------------

create policy "admin/owner can view invites"
  on public.invites for select
  using (
    org_id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(org_id) in ('owner', 'admin')
  );

create policy "admin/owner can create invites"
  on public.invites for insert
  with check (
    org_id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(org_id) in ('owner', 'admin')
  );

create policy "admin/owner can update invites"
  on public.invites for update
  using (
    org_id = any(public.get_my_org_ids())
    and public.get_my_role_in_org(org_id) in ('owner', 'admin')
  );

-- audit_logs --------------------------------------------------

create policy "org members can view audit logs"
  on public.audit_logs for select
  using (org_id = any(public.get_my_org_ids()));

create policy "authenticated users can insert audit logs"
  on public.audit_logs for insert
  with check (org_id = any(public.get_my_org_ids()));

-- ============================================================
-- 8. Drop deprecated columns from profiles
-- ============================================================

drop index if exists public.profiles_org_id_idx;

alter table public.profiles
  drop column if exists org_id,
  drop column if exists role,
  drop column if exists invite_status;

-- ============================================================
-- 9. Update handle_new_user — no longer sets role/invite_status
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;
