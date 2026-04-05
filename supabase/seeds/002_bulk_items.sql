-- ============================================================
-- Seed 002: Bulk / consumable items
-- Run after seeds/001_initial_data.sql.
-- Idempotent — deletes and re-inserts bulk assets on each run.
-- ============================================================

do $$
declare
  v_org_id   uuid;
  v_user_id  uuid;
  v_user_name text;

  -- new categories
  c_accessories uuid := gen_random_uuid();
  c_cameras     uuid := gen_random_uuid();

  -- new vendors
  v_anker    uuid := gen_random_uuid();
  v_logitech uuid := gen_random_uuid();
  v_tp_link  uuid := gen_random_uuid();

  -- existing dept / location ids (looked up below)
  d_it       uuid;
  d_ops      uuid;
  d_finance  uuid;
  d_hr       uuid;
  d_mktg     uuid;
  l_hq       uuid;
  l_warehouse uuid;
  l_remote   uuid;

  -- bulk asset ids
  a_usbc_cables    uuid := gen_random_uuid();
  a_usba_adapters  uuid := gen_random_uuid();
  a_eth_cables     uuid := gen_random_uuid();
  a_hdmi_cables    uuid := gen_random_uuid();
  a_usb_hubs       uuid := gen_random_uuid();
  a_webcams        uuid := gen_random_uuid();
  a_mice           uuid := gen_random_uuid();
  a_keyboards      uuid := gen_random_uuid();
  a_power_banks    uuid := gen_random_uuid();
  a_sec_cameras    uuid := gen_random_uuid();

begin
  -- Find the org that seed 001 populated (has all 5 expected departments)
  select d.org_id into v_org_id
    from public.departments d
    where d.name in ('IT', 'Operations', 'Finance', 'Human Resources', 'Marketing')
    group by d.org_id
    having count(*) = 5
    limit 1;

  if v_org_id is null then
    raise exception 'No organization found with seed 001 departments — run seed 001 first.';
  end if;

  select p.id, p.full_name into v_user_id, v_user_name
    from public.profiles p
    join public.user_org_memberships m on m.user_id = p.id
    where m.org_id = v_org_id and m.role = 'owner'
    limit 1;

  -- resolve existing departments and locations by name
  select id into d_it      from public.departments where org_id = v_org_id and name = 'IT'               limit 1;
  select id into d_ops     from public.departments where org_id = v_org_id and name = 'Operations'        limit 1;
  select id into d_finance from public.departments where org_id = v_org_id and name = 'Finance'           limit 1;
  select id into d_hr      from public.departments where org_id = v_org_id and name = 'Human Resources'   limit 1;
  select id into d_mktg    from public.departments where org_id = v_org_id and name = 'Marketing'         limit 1;
  select id into l_hq      from public.locations   where org_id = v_org_id and name = 'HQ — Floor 2'     limit 1;
  select id into l_warehouse from public.locations where org_id = v_org_id and name = 'Warehouse'         limit 1;
  select id into l_remote  from public.locations   where org_id = v_org_id and name = 'Remote'            limit 1;

  -- ── CLEANUP ─────────────────────────────────────────────────
  delete from public.asset_assignments
    where asset_id in (
      select id from public.assets where org_id = v_org_id and is_bulk = true
    );
  delete from public.assets     where org_id = v_org_id and is_bulk = true;
  delete from public.categories where org_id = v_org_id and name in ('Accessories & Peripherals', 'Security Cameras');
  delete from public.vendors    where org_id = v_org_id and name in ('Anker', 'Logitech', 'TP-Link');

  -- ── NEW CATEGORIES ──────────────────────────────────────────
  insert into public.categories (id, org_id, name, description) values
    (c_accessories, v_org_id, 'Accessories & Peripherals', 'Cables, adapters, hubs, keyboards, mice, and other peripherals'),
    (c_cameras,     v_org_id, 'Security Cameras',          'IP security cameras and surveillance equipment');

  -- ── NEW VENDORS ─────────────────────────────────────────────
  insert into public.vendors (id, org_id, name, contact_email, website) values
    (v_anker,    v_org_id, 'Anker',    'business@anker.com',    'anker.com/business'),
    (v_logitech, v_org_id, 'Logitech', 'sales@logitech.com',    'logitech.com/business'),
    (v_tp_link,  v_org_id, 'TP-Link',  'business@tp-link.com',  'tp-link.com/business');

  -- ── BULK ASSETS ─────────────────────────────────────────────
  insert into public.assets (
    id, org_id, asset_tag, name, is_bulk, quantity,
    category_id, department_id, location_id, vendor_id,
    status, purchase_date, purchase_cost,
    notes, created_by
  ) values
    (a_usbc_cables,   v_org_id, 'AT-B001', 'USB-C Cables 2m',              true, 60,
      c_accessories, d_it, l_warehouse, v_anker,
      'active', '2024-01-10', 12.99,
      'Braided nylon — compatible with MacBooks and USB-C devices', v_user_id),

    (a_usba_adapters, v_org_id, 'AT-B002', 'USB-A to USB-C Adapters',      true, 80,
      c_accessories, d_it, l_warehouse, v_anker,
      'active', '2024-01-10', 8.99,
      'For legacy devices connecting to USB-C hubs', v_user_id),

    (a_eth_cables,    v_org_id, 'AT-B003', 'Ethernet Cables CAT6 5m',      true, 50,
      c_accessories, d_it, l_warehouse, null,
      'active', '2023-11-01', 9.49,
      'CAT6 — sufficient for gigabit throughout the office', v_user_id),

    (a_hdmi_cables,   v_org_id, 'AT-B004', 'HDMI 2.1 Cables 2m',           true, 35,
      c_accessories, d_it, l_warehouse, v_anker,
      'active', '2024-02-15', 14.99,
      '4K/8K support — used with monitors and conference room displays', v_user_id),

    (a_usb_hubs,      v_org_id, 'AT-B005', 'USB-C 7-in-1 Hubs',            true, 25,
      c_accessories, d_it, l_warehouse, v_anker,
      'active', '2024-01-20', 39.99,
      'HDMI + 3×USB-A + USB-C PD + SD + MicroSD', v_user_id),

    (a_webcams,       v_org_id, 'AT-B006', 'Logitech C920 HD Webcams',     true, 20,
      c_accessories, d_it, l_warehouse, v_logitech,
      'active', '2023-09-01', 69.99,
      '1080p — distributed to remote employees and conference rooms', v_user_id),

    (a_mice,          v_org_id, 'AT-B007', 'Logitech MX Master 3S Mice',   true, 30,
      c_accessories, d_it, l_warehouse, v_logitech,
      'active', '2024-03-01', 99.99,
      'Wireless — primary peripherals for new hire kits', v_user_id),

    (a_keyboards,     v_org_id, 'AT-B008', 'Logitech MX Keys Keyboards',   true, 18,
      c_accessories, d_it, l_warehouse, v_logitech,
      'active', '2024-03-01', 109.99,
      'Wireless backlit — primary peripherals for new hire kits', v_user_id),

    (a_power_banks,   v_org_id, 'AT-B009', 'Anker Power Banks 20000mAh',   true, 15,
      c_accessories, d_ops, l_warehouse, v_anker,
      'active', '2024-02-01', 45.99,
      'For travel and field work — 65W PD output', v_user_id),

    (a_sec_cameras,   v_org_id, 'AT-B010', 'TP-Link Tapo C320WS Cameras',  true, 8,
      c_cameras, d_ops, l_warehouse, v_tp_link,
      'active', '2023-12-01', 59.99,
      '4MP outdoor IP cameras — office entrance and warehouse coverage', v_user_id);

  -- ── ASSIGNMENTS ─────────────────────────────────────────────
  -- USB-C Cables: 3 active assignments across departments
  insert into public.asset_assignments
    (asset_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, quantity, department_id, location_id)
  values
    (a_usbc_cables, 'Sarah Mitchell', v_user_id, v_user_name,
      now() - interval '20 days', 5, d_it, l_hq),
    (a_usbc_cables, 'James Thornton', v_user_id, v_user_name,
      now() - interval '10 days', 8, d_ops, l_hq),
    (a_usbc_cables, 'Remote Onboarding Kit', v_user_id, v_user_name,
      now() - interval '5 days', 10, d_hr, l_remote);

  -- USB-A Adapters: 2 assignments
  insert into public.asset_assignments
    (asset_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, quantity, department_id, location_id)
  values
    (a_usba_adapters, 'IT Supply Closet — Floor 2', v_user_id, v_user_name,
      now() - interval '30 days', 20, d_it, l_hq),
    (a_usba_adapters, 'Finance Team', v_user_id, v_user_name,
      now() - interval '15 days', 6, d_finance, l_hq);

  -- Ethernet Cables: 2 assignments
  insert into public.asset_assignments
    (asset_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, quantity, department_id, location_id)
  values
    (a_eth_cables, 'Server Room Setup', v_user_id, v_user_name,
      now() - interval '45 days', 12, d_it, l_hq),
    (a_eth_cables, 'Warehouse Network Run', v_user_id, v_user_name,
      now() - interval '60 days', 8, d_ops, l_warehouse);

  -- HDMI Cables: 2 assignments
  insert into public.asset_assignments
    (asset_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, quantity, department_id, location_id)
  values
    (a_hdmi_cables, 'Conference Room A & B', v_user_id, v_user_name,
      now() - interval '25 days', 6, d_it, l_hq),
    (a_hdmi_cables, 'Marketing Studio', v_user_id, v_user_name,
      now() - interval '12 days', 4, d_mktg, l_hq);

  -- USB Hubs: 2 assignments
  insert into public.asset_assignments
    (asset_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, quantity, department_id, location_id)
  values
    (a_usb_hubs, 'New Hire Batch — March 2025', v_user_id, v_user_name,
      now() - interval '10 days', 8, d_it, null),
    (a_usb_hubs, 'Finance Desk Refresh', v_user_id, v_user_name,
      now() - interval '30 days', 4, d_finance, l_hq);

  -- Webcams: 3 assignments
  insert into public.asset_assignments
    (asset_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at,
     expected_return_at, quantity, department_id, location_id)
  values
    (a_webcams, 'Remote Employee Pack — Q1', v_user_id, v_user_name,
      now() - interval '60 days', null, 6, d_hr, l_remote),
    (a_webcams, 'Conference Rooms', v_user_id, v_user_name,
      now() - interval '40 days', null, 3, d_it, l_hq),
    (a_webcams, 'Marketing Content Studio', v_user_id, v_user_name,
      now() - interval '20 days', now() + interval '30 days', 2, d_mktg, l_hq);

  -- Mice: 2 assignments
  insert into public.asset_assignments
    (asset_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, quantity, department_id, location_id)
  values
    (a_mice, 'New Hire Batch — March 2025', v_user_id, v_user_name,
      now() - interval '10 days', 10, d_it, null),
    (a_mice, 'Ops Team Refresh', v_user_id, v_user_name,
      now() - interval '5 days', 5, d_ops, l_hq);

  -- Keyboards: 1 assignment
  insert into public.asset_assignments
    (asset_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, quantity, department_id, location_id)
  values
    (a_keyboards, 'New Hire Batch — March 2025', v_user_id, v_user_name,
      now() - interval '10 days', 8, d_it, null);

  -- Power Banks: 2 assignments
  insert into public.asset_assignments
    (asset_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at,
     expected_return_at, quantity, department_id, location_id)
  values
    (a_power_banks, 'Alex Rivera — Trade Show Trip', v_user_id, v_user_name,
      now() - interval '5 days', now() + interval '10 days', 3, d_mktg, l_remote),
    (a_power_banks, 'Field Operations Team', v_user_id, v_user_name,
      now() - interval '14 days', null, 4, d_ops, l_remote);

  -- Security Cameras: 1 assignment
  insert into public.asset_assignments
    (asset_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, quantity, department_id, location_id)
  values
    (a_sec_cameras, 'Warehouse Installation', v_user_id, v_user_name,
      now() - interval '90 days', 4, d_ops, l_warehouse);

  raise notice 'Seed 002 complete — 10 bulk assets, 2 categories, 3 vendors, 20 assignments.';
end $$;
