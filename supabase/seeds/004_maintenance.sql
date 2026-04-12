-- ============================================================
-- Seed 004: Maintenance events for Acme Corp
--
-- Creates a realistic spread of maintenance events across
-- existing Acme Corp assets:
--   - Several completed events with costs and notes
--   - One in_progress event (drives the dashboard count)
--   - Upcoming scheduled events (triggers dashboard card
--     and checkout warning)
-- ============================================================

do $$
declare
  v_org_id uuid := '00000000-0000-0000-0000-000000000001';
  u_admin  uuid := '00000000-0000-0000-0000-000000000012';
  u_editor uuid := '00000000-0000-0000-0000-000000000013';

  a_laptop1    uuid;
  a_laptop2    uuid;
  a_monitor    uuid;
  a_phone      uuid;
  a_projector  uuid;
begin
  -- ── CLEANUP ──────────────────────────────────────────────
  delete from public.maintenance_events where org_id = v_org_id;

  -- ── RESOLVE ASSET IDs BY TAG ─────────────────────────────
  select id into a_laptop1   from public.assets where asset_tag = 'AT-0001' and org_id = v_org_id;
  select id into a_laptop2   from public.assets where asset_tag = 'AT-0002' and org_id = v_org_id;
  select id into a_monitor   from public.assets where asset_tag = 'AT-0006' and org_id = v_org_id;
  select id into a_phone     from public.assets where asset_tag = 'AT-0011' and org_id = v_org_id;
  select id into a_projector from public.assets where asset_tag = 'AT-0020' and org_id = v_org_id;

  -- ── COMPLETED EVENTS ─────────────────────────────────────

  -- Laptop 1: completed annual inspection (6 months ago)
  if a_laptop1 is not null then
    insert into public.maintenance_events (
      org_id, asset_id, title, type, status,
      scheduled_date, started_at, completed_at,
      cost, technician_name, notes, created_by
    ) values (
      v_org_id, a_laptop1, 'Annual inspection', 'inspection', 'completed',
      current_date - interval '6 months',
      current_date - interval '6 months',
      current_date - interval '6 months' + interval '2 hours',
      0, 'IT Team', 'Passed all checks. Battery at 87% health.', u_admin
    );
  end if;

  -- Laptop 2: completed screen replacement (3 months ago)
  if a_laptop2 is not null then
    insert into public.maintenance_events (
      org_id, asset_id, title, type, status,
      scheduled_date, started_at, completed_at,
      cost, technician_name, notes, created_by
    ) values (
      v_org_id, a_laptop2, 'Screen replacement', 'corrective', 'completed',
      current_date - interval '3 months',
      current_date - interval '3 months',
      current_date - interval '3 months' + interval '4 hours',
      350.00, 'Bob Walsh', 'Replaced cracked LCD panel. Tested — no dead pixels.', u_admin
    );
  end if;

  -- Monitor: completed calibration (2 months ago)
  if a_monitor is not null then
    insert into public.maintenance_events (
      org_id, asset_id, title, type, status,
      scheduled_date, started_at, completed_at,
      cost, technician_name, notes, created_by
    ) values (
      v_org_id, a_monitor, 'Display calibration', 'preventive', 'completed',
      current_date - interval '2 months',
      current_date - interval '2 months',
      current_date - interval '2 months' + interval '1 hour',
      75.00, 'IT Team', 'Calibrated color profile. Delta-E now within acceptable range.', u_editor
    );
  end if;

  -- ── IN_PROGRESS EVENT (drives dashboard under_maintenance count) ──

  -- Phone: currently in_progress repair — also set asset status
  if a_phone is not null then
    insert into public.maintenance_events (
      org_id, asset_id, title, type, status,
      scheduled_date, started_at,
      technician_name, notes, created_by
    ) values (
      v_org_id, a_phone, 'Battery replacement', 'corrective', 'in_progress',
      current_date - interval '1 day',
      current_date - interval '1 day',
      'Bob Walsh', 'Battery swelling detected. Replacement ordered.', u_admin
    );

    update public.assets
      set status = 'under_maintenance'
      where id = a_phone and org_id = v_org_id;
  end if;

  -- ── SCHEDULED EVENTS (upcoming — triggers dashboard card + checkout warning) ──

  -- Laptop 1: upcoming preventive maintenance next week
  if a_laptop1 is not null then
    insert into public.maintenance_events (
      org_id, asset_id, title, type, status,
      scheduled_date, technician_name, notes, created_by
    ) values (
      v_org_id, a_laptop1, 'Quarterly checkup', 'preventive', 'scheduled',
      current_date + interval '7 days',
      'IT Team', 'Routine quarterly health check.', u_admin
    );
  end if;

  -- Projector: upcoming inspection in 2 weeks
  if a_projector is not null then
    insert into public.maintenance_events (
      org_id, asset_id, title, type, status,
      scheduled_date, notes, created_by
    ) values (
      v_org_id, a_projector, 'Lamp hours inspection', 'inspection', 'scheduled',
      current_date + interval '14 days',
      'Check lamp hours and clean filter.', u_editor
    );
  end if;

end;
$$;
