-- ============================================================
-- Maintenance Events
-- Adds maintenance_events table, RLS, partial unique index,
-- and extends the audit_action enum with maintenance actions.
-- ============================================================

-- -------------------------------------------------------
-- Extend audit_action enum
-- -------------------------------------------------------

alter type public.audit_action add value if not exists 'maintenance_scheduled';
alter type public.audit_action add value if not exists 'maintenance_started';
alter type public.audit_action add value if not exists 'maintenance_completed';

-- -------------------------------------------------------
-- Enums
-- -------------------------------------------------------

create type public.maintenance_type as enum ('preventive', 'corrective', 'inspection');
create type public.maintenance_status as enum ('scheduled', 'in_progress', 'completed');

-- -------------------------------------------------------
-- Table
-- -------------------------------------------------------

create table public.maintenance_events (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  asset_id         uuid not null references public.assets (id) on delete cascade,
  title            text not null,
  type             public.maintenance_type not null,
  status           public.maintenance_status not null default 'scheduled',
  scheduled_date   date not null,
  started_at       timestamptz,
  completed_at     timestamptz,
  cost             numeric(12, 2),
  technician_name  text,
  notes            text,
  created_by       uuid references public.profiles (id) on delete set null,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger maintenance_events_updated_at
  before update on public.maintenance_events
  for each row execute function public.handle_updated_at();

-- -------------------------------------------------------
-- Indexes
-- -------------------------------------------------------

create index on public.maintenance_events (org_id) where deleted_at is null;
create index on public.maintenance_events (asset_id) where deleted_at is null;
create index on public.maintenance_events (org_id, scheduled_date) where deleted_at is null;

-- One-active-event constraint: at most one scheduled or in_progress event per asset.
-- This is the DB-level safety net — the domain enforces it first, but this
-- catches concurrent inserts that both pass the domain check.
create unique index maintenance_events_one_active_per_asset
  on public.maintenance_events (asset_id)
  where status in ('scheduled', 'in_progress') and deleted_at is null;

-- -------------------------------------------------------
-- Row Level Security
-- All policies filter on deleted_at IS NULL to prevent
-- soft-deleted records from leaking into queries.
-- Fine-grained permission logic (who can delete whose events)
-- is enforced at the action layer using the admin client.
-- -------------------------------------------------------

alter table public.maintenance_events enable row level security;

create policy "org members can view maintenance events"
  on public.maintenance_events for select
  using (
    org_id = public.get_my_org_id()
    and deleted_at is null
  );

create policy "editor+ can insert maintenance events"
  on public.maintenance_events for insert
  with check (
    org_id = public.get_my_org_id()
    and public.get_my_role() in ('owner', 'admin', 'editor')
  );

create policy "editor+ can update maintenance events"
  on public.maintenance_events for update
  using (
    org_id = public.get_my_org_id()
    and deleted_at is null
    and public.get_my_role() in ('owner', 'admin', 'editor')
  );
