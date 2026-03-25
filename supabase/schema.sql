-- ============================================================
-- Trackly — Phase 2 Database Schema
-- Run this entire file in Supabase SQL Editor (once, on a fresh project)
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type public.user_role as enum ('owner', 'admin', 'editor', 'viewer');

-- Profile/account status (not invite status — this lives on profiles)
create type public.invite_status as enum ('active', 'pending', 'deactivated');

create type public.asset_status as enum (
  'active',
  'under_maintenance',
  'retired',
  'lost',
  'in_storage',
  'checked_out'
);

create type public.audit_action as enum (
  'created',
  'updated',
  'deleted',
  'checked_out',
  'returned',
  'status_changed',
  'invited',
  'role_changed'
);

-- ============================================================
-- UTILITY: updated_at trigger
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- organizations
create table public.organizations (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique,
  owner_id              uuid references auth.users (id) on delete set null,
  onboarding_completed  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.handle_updated_at();

-- profiles (one per auth.user)
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  org_id         uuid references public.organizations (id) on delete cascade,
  full_name      text not null,
  email          text not null,
  avatar_url     text,
  role           public.user_role not null default 'viewer',
  invite_status  public.invite_status not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- departments
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null,
  description text,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger departments_updated_at
  before update on public.departments
  for each row execute function public.handle_updated_at();

-- user <-> department membership
create table public.user_departments (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, department_id)
);

-- categories
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null,
  description text,
  icon        text,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.handle_updated_at();

-- locations
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null,
  description text,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger locations_updated_at
  before update on public.locations
  for each row execute function public.handle_updated_at();

-- vendors
create table public.vendors (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  name          text not null,
  contact_email text,
  contact_phone text,
  website       text,
  notes         text,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger vendors_updated_at
  before update on public.vendors
  for each row execute function public.handle_updated_at();

-- assets
create table public.assets (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  asset_tag       text not null,
  name            text not null,
  category_id     uuid references public.categories (id) on delete set null,
  department_id   uuid references public.departments (id) on delete set null,
  location_id     uuid references public.locations (id) on delete set null,
  status          public.asset_status not null default 'active',
  purchase_date   date,
  purchase_cost   numeric(12, 2),
  warranty_expiry date,
  vendor_id       uuid references public.vendors (id) on delete set null,
  notes           text,
  image_url       text,
  deleted_at      timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, asset_tag)
);

create trigger assets_updated_at
  before update on public.assets
  for each row execute function public.handle_updated_at();

-- asset_assignments (checkout history)
create table public.asset_assignments (
  id                  uuid primary key default gen_random_uuid(),
  asset_id            uuid not null references public.assets (id) on delete cascade,
  assigned_to_user_id uuid references public.profiles (id) on delete set null,
  assigned_to_name    text not null,
  assigned_by         uuid references public.profiles (id) on delete set null,
  assigned_by_name    text not null,
  assigned_at         timestamptz not null default now(),
  expected_return_at  timestamptz,
  returned_at         timestamptz,
  notes               text
);

-- invites
create table public.invites (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  email            text not null,
  role             public.user_role not null default 'viewer',
  token            text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by       uuid references public.profiles (id) on delete set null,
  invited_by_name  text not null,
  accepted_at      timestamptz,
  expires_at       timestamptz not null default now() + interval '7 days',
  created_at       timestamptz not null default now()
);

-- audit_logs
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_name  text not null,
  entity_type text not null,  -- 'asset' | 'user' | 'department' | 'category' | 'location' | 'vendor'
  entity_id   uuid not null,
  entity_name text not null,
  action      public.audit_action not null,
  changes     jsonb,          -- { field: { old: value, new: value } }
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index on public.profiles (org_id);
create index on public.departments (org_id) where deleted_at is null;
create index on public.categories (org_id) where deleted_at is null;
create index on public.locations (org_id) where deleted_at is null;
create index on public.vendors (org_id) where deleted_at is null;
create index on public.assets (org_id) where deleted_at is null;
create index on public.assets (department_id) where deleted_at is null;
create index on public.asset_assignments (asset_id);
create index on public.audit_logs (org_id, entity_id);
create index on public.invites (token) where accepted_at is null;

-- ============================================================
-- HELPER FUNCTIONS
-- security definer = bypass RLS when called from policies,
-- preventing recursive policy evaluation
-- ============================================================

create or replace function public.get_my_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = (select auth.uid())
$$;

create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

-- Used in assets policies to check department membership without
-- triggering RLS recursion on user_departments
create or replace function public.has_department_access(dept_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_departments
    where user_id = (select auth.uid()) and department_id = dept_id
  )
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organizations     enable row level security;
alter table public.profiles          enable row level security;
alter table public.departments       enable row level security;
alter table public.user_departments  enable row level security;
alter table public.categories        enable row level security;
alter table public.locations         enable row level security;
alter table public.vendors           enable row level security;
alter table public.assets            enable row level security;
alter table public.asset_assignments enable row level security;
alter table public.invites           enable row level security;
alter table public.audit_logs        enable row level security;

-- -------------------------------------------------------
-- organizations
-- -------------------------------------------------------

create policy "members can view their org"
  on public.organizations for select
  using (id = public.get_my_org_id());

create policy "authenticated users can create org"
  on public.organizations for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

create policy "owner or admin can update org"
  on public.organizations for update
  using (id = public.get_my_org_id() and public.get_my_role() in ('owner', 'admin'));

-- -------------------------------------------------------
-- profiles
-- -------------------------------------------------------

create policy "users can view profiles in their org"
  on public.profiles for select
  using (
    id = (select auth.uid())           -- always see own profile (covers null org_id)
    or org_id = public.get_my_org_id() -- see teammates once in an org
  );

-- Users can update their own profile; admins/owners can update anyone in the org
create policy "users can update own profile"
  on public.profiles for update
  using (id = (select auth.uid()));

create policy "admin/owner can update profiles in org"
  on public.profiles for update
  using (org_id = public.get_my_org_id() and public.get_my_role() in ('owner', 'admin'));

-- -------------------------------------------------------
-- departments
-- -------------------------------------------------------

create policy "org members can view departments"
  on public.departments for select
  using (org_id = public.get_my_org_id());

create policy "admin/owner can manage departments"
  on public.departments for all
  using (org_id = public.get_my_org_id() and public.get_my_role() in ('owner', 'admin'));

-- -------------------------------------------------------
-- user_departments
-- -------------------------------------------------------

create policy "org members can view user_departments"
  on public.user_departments for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = user_departments.user_id and p.org_id = public.get_my_org_id()
    )
  );

create policy "admin/owner can manage user_departments"
  on public.user_departments for all
  using (public.get_my_role() in ('owner', 'admin'));

-- -------------------------------------------------------
-- categories
-- -------------------------------------------------------

create policy "org members can view categories"
  on public.categories for select
  using (org_id = public.get_my_org_id());

create policy "admin/owner can manage categories"
  on public.categories for all
  using (org_id = public.get_my_org_id() and public.get_my_role() in ('owner', 'admin'));

-- -------------------------------------------------------
-- locations
-- -------------------------------------------------------

create policy "org members can view locations"
  on public.locations for select
  using (org_id = public.get_my_org_id());

create policy "admin/owner can manage locations"
  on public.locations for all
  using (org_id = public.get_my_org_id() and public.get_my_role() in ('owner', 'admin'));

-- -------------------------------------------------------
-- vendors
-- -------------------------------------------------------

create policy "org members can view vendors"
  on public.vendors for select
  using (org_id = public.get_my_org_id());

create policy "admin/owner can manage vendors"
  on public.vendors for all
  using (org_id = public.get_my_org_id() and public.get_my_role() in ('owner', 'admin'));

-- -------------------------------------------------------
-- assets
-- -------------------------------------------------------

create policy "org members can view their assets"
  on public.assets for select
  using (
    org_id = public.get_my_org_id()
    and deleted_at is null
    and (
      public.get_my_role() in ('owner', 'admin')
      or public.has_department_access(assets.department_id)
    )
  );

create policy "editor+ can insert assets"
  on public.assets for insert
  with check (
    org_id = public.get_my_org_id()
    and public.get_my_role() in ('owner', 'admin', 'editor')
  );

create policy "editor+ can update assets in their scope"
  on public.assets for update
  using (
    org_id = public.get_my_org_id()
    and (
      public.get_my_role() in ('owner', 'admin')
      or (
        public.get_my_role() = 'editor'
        and public.has_department_access(assets.department_id)
      )
    )
  );

create policy "admin/owner can delete assets"
  on public.assets for delete
  using (org_id = public.get_my_org_id() and public.get_my_role() in ('owner', 'admin'));

-- -------------------------------------------------------
-- asset_assignments
-- -------------------------------------------------------

create policy "org members can view assignments"
  on public.asset_assignments for select
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_assignments.asset_id and a.org_id = public.get_my_org_id()
    )
  );

create policy "editor+ can manage assignments"
  on public.asset_assignments for all
  using (
    public.get_my_role() in ('owner', 'admin', 'editor')
    and exists (
      select 1 from public.assets a
      where a.id = asset_assignments.asset_id and a.org_id = public.get_my_org_id()
    )
  );

-- -------------------------------------------------------
-- invites
-- -------------------------------------------------------

create policy "admin/owner can view invites"
  on public.invites for select
  using (org_id = public.get_my_org_id() and public.get_my_role() in ('owner', 'admin'));

create policy "admin/owner can create invites"
  on public.invites for insert
  with check (org_id = public.get_my_org_id() and public.get_my_role() in ('owner', 'admin'));

create policy "admin/owner can update invites"
  on public.invites for update
  using (org_id = public.get_my_org_id() and public.get_my_role() in ('owner', 'admin'));

-- -------------------------------------------------------
-- audit_logs
-- -------------------------------------------------------

create policy "org members can view audit logs"
  on public.audit_logs for select
  using (org_id = public.get_my_org_id());

create policy "authenticated users can insert audit logs"
  on public.audit_logs for insert
  with check (org_id = public.get_my_org_id());

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Fires after a new row in auth.users; creates the profile
-- with invite_status = 'pending' until org is attached.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, invite_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'owner',   -- first user of their org; downgraded if joining via invite
    'pending'  -- set to 'active' once org is created or invite accepted
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
