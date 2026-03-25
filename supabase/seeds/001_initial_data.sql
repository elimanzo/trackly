-- ============================================================
-- Seed 001: Initial data
-- Run in Supabase SQL Editor after schema.sql + all migrations.
-- Idempotent — clears and re-inserts org data on each run.
-- To update seed data, create seeds/002_*.sql instead of editing this file.
-- ============================================================

do $$
declare
  v_org_id   uuid;
  v_user_id  uuid;

  -- departments
  d_it       uuid := gen_random_uuid();
  d_finance  uuid := gen_random_uuid();
  d_hr       uuid := gen_random_uuid();
  d_ops      uuid := gen_random_uuid();
  d_mktg     uuid := gen_random_uuid();

  -- categories
  c_laptops  uuid := gen_random_uuid();
  c_monitors uuid := gen_random_uuid();
  c_desks    uuid := gen_random_uuid();
  c_phones   uuid := gen_random_uuid();
  c_network  uuid := gen_random_uuid();
  c_software uuid := gen_random_uuid();

  -- locations
  l_hq       uuid := gen_random_uuid();
  l_remote   uuid := gen_random_uuid();
  l_warehouse uuid := gen_random_uuid();

  -- vendors
  v_apple    uuid := gen_random_uuid();
  v_dell     uuid := gen_random_uuid();
  v_herman   uuid := gen_random_uuid();
  v_cisco    uuid := gen_random_uuid();
  v_msft     uuid := gen_random_uuid();

begin
  -- resolve org and user
  select id into v_org_id  from public.organizations limit 1;
  select id into v_user_id from public.profiles      limit 1;

  if v_org_id is null then
    raise exception 'No organization found — sign up and complete onboarding first.';
  end if;

  -- ── CLEANUP (idempotent re-run) ─────────────────────────────
  delete from public.asset_assignments
    where asset_id in (select id from public.assets where org_id = v_org_id);
  delete from public.assets       where org_id = v_org_id;
  delete from public.departments  where org_id = v_org_id;
  delete from public.categories   where org_id = v_org_id;
  delete from public.locations    where org_id = v_org_id;
  delete from public.vendors      where org_id = v_org_id;

  -- ── DEPARTMENTS ────────────────────────────────────────────
  insert into public.departments (id, org_id, name, description) values
    (d_it,      v_org_id, 'IT',                'Infrastructure, hardware, software, and internal tooling'),
    (d_finance, v_org_id, 'Finance',           'Accounting, budgeting, and financial reporting'),
    (d_hr,      v_org_id, 'Human Resources',   'Recruiting, onboarding, employee relations, and benefits'),
    (d_ops,     v_org_id, 'Operations',        'Facilities, logistics, and day-to-day business operations'),
    (d_mktg,    v_org_id, 'Marketing',         'Brand, campaigns, content, and growth');

  -- ── CATEGORIES ─────────────────────────────────────────────
  insert into public.categories (id, org_id, name, description) values
    (c_laptops,  v_org_id, 'Laptops',               'Portable computers including MacBooks and Windows laptops'),
    (c_monitors, v_org_id, 'Monitors',               'Desktop displays and external screens'),
    (c_desks,    v_org_id, 'Desks & Furniture',      'Standing desks, chairs, and other office furniture'),
    (c_phones,   v_org_id, 'Mobile Phones',          'Smartphones and tablets assigned to employees'),
    (c_network,  v_org_id, 'Networking Equipment',   'Switches, firewalls, access points, and cabling'),
    (c_software, v_org_id, 'Software Licenses',      'SaaS subscriptions and perpetual software licenses');

  -- ── LOCATIONS ──────────────────────────────────────────────
  insert into public.locations (id, org_id, name, description) values
    (l_hq,        v_org_id, 'HQ — Floor 2',  'Main office, second floor — open plan and private offices'),
    (l_remote,    v_org_id, 'Remote',         'Assets assigned to fully remote employees'),
    (l_warehouse, v_org_id, 'Warehouse',      'Storage facility for spare, retired, and in-transit assets');

  -- ── VENDORS ────────────────────────────────────────────────
  insert into public.vendors (id, org_id, name, contact_email, contact_phone, website) values
    (v_apple, v_org_id, 'Apple',         'business@apple.com',         '+1 800-854-3680', 'apple.com/business'),
    (v_dell,  v_org_id, 'Dell',          'sales@dell.com',             '+1 800-999-3355', 'dell.com/business'),
    (v_herman,v_org_id, 'Herman Miller', 'orders@hermanmiller.com',    '+1 888-443-4357', 'hermanmiller.com'),
    (v_cisco, v_org_id, 'Cisco',         'enterprise@cisco.com',       '+1 800-553-6387', 'cisco.com'),
    (v_msft,  v_org_id, 'Microsoft',     'volume@microsoft.com',       '+1 800-642-7676', 'microsoft.com/licensing');

  -- ── ASSETS ─────────────────────────────────────────────────
  insert into public.assets (
    org_id, asset_tag, name,
    category_id, department_id, location_id, vendor_id,
    status, purchase_date, purchase_cost, warranty_expiry,
    notes, created_by
  ) values
    -- IT — Laptops
    (v_org_id, 'AT-0001', 'MacBook Pro 16" (M3 Pro)',
      c_laptops, d_it, l_hq, v_apple,
      'active', '2024-01-15', 2499.00, '2027-01-15',
      'Assigned to lead engineer', v_user_id),

    (v_org_id, 'AT-0002', 'MacBook Air 13" (M2)',
      c_laptops, d_it, l_remote, v_apple,
      'checked_out', '2024-03-01', 1299.00, '2027-03-01',
      null, v_user_id),

    (v_org_id, 'AT-0003', 'Dell XPS 15',
      c_laptops, d_finance, l_hq, v_dell,
      'active', '2023-09-10', 1799.00, '2026-09-10',
      null, v_user_id),

    (v_org_id, 'AT-0004', 'Dell Latitude 5540',
      c_laptops, d_hr, l_hq, v_dell,
      'active', '2023-11-20', 1199.00, '2026-11-20',
      null, v_user_id),

    (v_org_id, 'AT-0005', 'MacBook Pro 14" (M3)',
      c_laptops, d_mktg, l_remote, v_apple,
      'active', '2024-06-01', 1999.00, '2027-06-01',
      null, v_user_id),

    (v_org_id, 'AT-0006', 'Dell Inspiron 15',
      c_laptops, d_ops, l_warehouse, v_dell,
      'under_maintenance', '2022-05-15', 899.00, '2025-05-15',
      'Screen hinge repair', v_user_id),

    -- Monitors
    (v_org_id, 'AT-0007', 'LG UltraFine 5K 27"',
      c_monitors, d_it, l_hq, null,
      'active', '2023-07-20', 1299.00, '2026-07-20',
      null, v_user_id),

    (v_org_id, 'AT-0008', 'Dell U2723D 27" 4K',
      c_monitors, d_finance, l_hq, v_dell,
      'active', '2023-08-01', 649.00, '2026-08-01',
      null, v_user_id),

    (v_org_id, 'AT-0009', 'Dell U2723D 27" 4K',
      c_monitors, d_hr, l_hq, v_dell,
      'active', '2023-08-01', 649.00, '2026-08-01',
      null, v_user_id),

    (v_org_id, 'AT-0010', 'Samsung 32" Curved',
      c_monitors, d_ops, l_warehouse, null,
      'in_storage', '2021-03-10', 499.00, '2024-03-10',
      'Spare monitor in storage', v_user_id),

    -- Phones
    (v_org_id, 'AT-0011', 'iPhone 15 Pro',
      c_phones, d_it, l_hq, v_apple,
      'checked_out', '2024-02-14', 999.00, '2026-02-14',
      null, v_user_id),

    (v_org_id, 'AT-0012', 'iPhone 14',
      c_phones, d_mktg, l_remote, v_apple,
      'active', '2023-10-01', 799.00, '2025-10-01',
      null, v_user_id),

    (v_org_id, 'AT-0013', 'iPhone 14',
      c_phones, d_finance, l_hq, v_apple,
      'active', '2023-10-01', 799.00, '2025-10-01',
      null, v_user_id),

    (v_org_id, 'AT-0014', 'iPhone 13',
      c_phones, d_hr, l_hq, v_apple,
      'lost', '2022-11-01', 699.00, null,
      'Reported lost by employee', v_user_id),

    -- Networking
    (v_org_id, 'AT-0015', 'Cisco Catalyst 9200 Switch',
      c_network, d_it, l_hq, v_cisco,
      'active', '2023-01-10', 3200.00, '2026-01-10',
      'Core network switch — floor 2', v_user_id),

    (v_org_id, 'AT-0016', 'Cisco Meraki MX67 Firewall',
      c_network, d_it, l_hq, v_cisco,
      'active', '2023-01-10', 1800.00, '2026-01-10',
      null, v_user_id),

    (v_org_id, 'AT-0017', 'Cisco AP 9120AX',
      c_network, d_it, l_warehouse, v_cisco,
      'active', '2023-06-01', 850.00, '2026-06-01',
      'Warehouse access point', v_user_id),

    -- Software
    (v_org_id, 'AT-0018', 'Adobe Creative Cloud (10-seat)',
      c_software, d_mktg, null, v_msft,
      'active', '2024-01-01', 5999.00, '2025-01-01',
      'Annual subscription — renewal Jan 2025', v_user_id),

    (v_org_id, 'AT-0019', 'Microsoft 365 Business (25-seat)',
      c_software, d_it, null, v_msft,
      'active', '2024-04-01', 3750.00, '2025-04-01',
      'Annual subscription', v_user_id),

    -- Desks & Furniture
    (v_org_id, 'AT-0020', 'Herman Miller Aeron Chair',
      c_desks, d_it, l_hq, v_herman,
      'active', '2023-05-01', 1495.00, null,
      null, v_user_id),

    (v_org_id, 'AT-0021', 'Herman Miller Aeron Chair',
      c_desks, d_finance, l_hq, v_herman,
      'active', '2023-05-01', 1495.00, null,
      null, v_user_id),

    (v_org_id, 'AT-0022', 'Uplift Standing Desk 60"',
      c_desks, d_it, l_hq, null,
      'active', '2023-05-01', 1299.00, null,
      null, v_user_id),

    (v_org_id, 'AT-0023', 'Uplift Standing Desk 60"',
      c_desks, d_mktg, l_hq, null,
      'active', '2023-05-01', 1299.00, null,
      null, v_user_id),

    -- Retired / misc
    (v_org_id, 'AT-0024', 'MacBook Pro 13" (Intel, 2019)',
      c_laptops, d_it, l_warehouse, v_apple,
      'retired', '2019-06-01', 1299.00, '2022-06-01',
      'Replaced — stored for data wipe', v_user_id),

    (v_org_id, 'AT-0025', 'Dell OptiPlex 7090 Desktop',
      c_laptops, d_ops, l_warehouse, v_dell,
      'in_storage', '2021-08-01', 899.00, '2024-08-01',
      'Spare machine', v_user_id),

    (v_org_id, 'AT-0026', 'MacBook Air 13" (M1)',
      c_laptops, d_hr, l_remote, v_apple,
      'active', '2022-09-01', 999.00, '2025-09-01',
      null, v_user_id),

    (v_org_id, 'AT-0027', 'Cisco IP Phone 8851',
      c_phones, d_ops, l_hq, v_cisco,
      'active', '2022-01-15', 249.00, '2025-01-15',
      null, v_user_id),

    (v_org_id, 'AT-0028', 'Cisco IP Phone 8851',
      c_phones, d_finance, l_hq, v_cisco,
      'active', '2022-01-15', 249.00, '2025-01-15',
      null, v_user_id),

    (v_org_id, 'AT-0029', 'LG 34" UltraWide Monitor',
      c_monitors, d_mktg, l_hq, null,
      'active', '2023-11-01', 799.00, '2026-11-01',
      null, v_user_id),

    (v_org_id, 'AT-0030', 'iPad Pro 12.9" (M2)',
      c_phones, d_mktg, l_remote, v_apple,
      'checked_out', '2024-03-15', 1099.00, '2026-03-15',
      'Used for presentations', v_user_id),

    -- AT-0031 to AT-0050 — additional assets
    (v_org_id, 'AT-0031', 'MacBook Pro 14" (M3 Pro)',
      c_laptops, d_finance, l_remote, v_apple,
      'active', '2024-04-01', 1999.00, '2027-04-01',
      null, v_user_id),

    (v_org_id, 'AT-0032', 'Dell XPS 13',
      c_laptops, d_hr, l_hq, v_dell,
      'active', '2023-12-01', 1249.00, '2026-12-01',
      null, v_user_id),

    (v_org_id, 'AT-0033', 'Dell Latitude 7440',
      c_laptops, d_ops, l_hq, v_dell,
      'active', '2024-02-01', 1499.00, '2027-02-01',
      null, v_user_id),

    (v_org_id, 'AT-0034', 'MacBook Air 15" (M2)',
      c_laptops, d_mktg, l_hq, v_apple,
      'active', '2023-07-01', 1299.00, '2026-07-01',
      null, v_user_id),

    (v_org_id, 'AT-0035', 'Dell U3223QE 32" 4K',
      c_monitors, d_it, l_hq, v_dell,
      'active', '2024-01-10', 849.00, '2027-01-10',
      null, v_user_id),

    (v_org_id, 'AT-0036', 'LG UltraFine 5K 27"',
      c_monitors, d_finance, l_hq, null,
      'active', '2023-03-15', 1299.00, '2026-03-15',
      null, v_user_id),

    (v_org_id, 'AT-0037', 'Dell S2722QC 27" 4K',
      c_monitors, d_hr, l_hq, v_dell,
      'active', '2022-11-01', 399.00, '2025-11-01',
      null, v_user_id),

    (v_org_id, 'AT-0038', 'Samsung 27" FHD',
      c_monitors, d_ops, l_warehouse, null,
      'in_storage', '2021-06-01', 299.00, '2024-06-01',
      'Spare — older model', v_user_id),

    (v_org_id, 'AT-0039', 'iPhone 15',
      c_phones, d_ops, l_hq, v_apple,
      'active', '2024-01-20', 799.00, '2026-01-20',
      null, v_user_id),

    (v_org_id, 'AT-0040', 'iPhone 13',
      c_phones, d_hr, l_remote, v_apple,
      'active', '2022-10-01', 699.00, '2024-10-01',
      null, v_user_id),

    (v_org_id, 'AT-0041', 'Cisco Catalyst 9300 Switch',
      c_network, d_it, l_hq, v_cisco,
      'active', '2022-08-01', 4200.00, '2025-08-01',
      'Distribution layer switch', v_user_id),

    (v_org_id, 'AT-0042', 'Cisco AP 9130AX',
      c_network, d_it, l_hq, v_cisco,
      'active', '2023-06-01', 750.00, '2026-06-01',
      'HQ access point — floor 2', v_user_id),

    (v_org_id, 'AT-0043', 'Microsoft 365 Business (10-seat)',
      c_software, d_ops, null, v_msft,
      'active', '2024-03-01', 1500.00, '2025-03-01',
      'Annual renewal Mar 2025', v_user_id),

    (v_org_id, 'AT-0044', 'Slack Pro (org-wide)',
      c_software, d_it, null, null,
      'active', '2024-01-01', 8750.00, '2025-01-01',
      '50-seat annual plan', v_user_id),

    (v_org_id, 'AT-0045', 'Herman Miller Aeron Chair',
      c_desks, d_hr, l_hq, v_herman,
      'active', '2023-05-01', 1495.00, null,
      null, v_user_id),

    (v_org_id, 'AT-0046', 'Herman Miller Aeron Chair',
      c_desks, d_ops, l_hq, v_herman,
      'active', '2023-05-01', 1495.00, null,
      null, v_user_id),

    (v_org_id, 'AT-0047', 'Uplift Standing Desk 60"',
      c_desks, d_finance, l_hq, null,
      'active', '2023-05-01', 1299.00, null,
      null, v_user_id),

    (v_org_id, 'AT-0048', 'Uplift Standing Desk 60"',
      c_desks, d_hr, l_hq, null,
      'active', '2023-05-01', 1299.00, null,
      null, v_user_id),

    (v_org_id, 'AT-0049', 'Dell Latitude 5540',
      c_laptops, d_mktg, l_remote, v_dell,
      'under_maintenance', '2023-04-01', 1199.00, '2026-04-01',
      'Battery replacement in progress', v_user_id),

    (v_org_id, 'AT-0050', 'MacBook Pro 13" (M2)',
      c_laptops, d_it, l_hq, v_apple,
      'active', '2023-08-01', 1299.00, '2026-08-01',
      null, v_user_id);

  -- ── CHECKOUT one asset for a realistic assignment record ────
  insert into public.asset_assignments (
    asset_id, assigned_to_user_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, expected_return_at
  )
  select
    id,
    v_user_id,
    (select full_name from public.profiles where id = v_user_id),
    v_user_id,
    (select full_name from public.profiles where id = v_user_id),
    now() - interval '14 days',
    now() + interval '16 days'
  from public.assets
  where asset_tag = 'AT-0002' and org_id = v_org_id;

  insert into public.asset_assignments (
    asset_id, assigned_to_user_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, expected_return_at
  )
  select
    id,
    v_user_id,
    (select full_name from public.profiles where id = v_user_id),
    v_user_id,
    (select full_name from public.profiles where id = v_user_id),
    now() - interval '30 days',
    now() + interval '60 days'
  from public.assets
  where asset_tag = 'AT-0011' and org_id = v_org_id;

  insert into public.asset_assignments (
    asset_id, assigned_to_user_id, assigned_to_name, assigned_by, assigned_by_name, assigned_at, expected_return_at
  )
  select
    id,
    v_user_id,
    (select full_name from public.profiles where id = v_user_id),
    v_user_id,
    (select full_name from public.profiles where id = v_user_id),
    now() - interval '7 days',
    null
  from public.assets
  where asset_tag = 'AT-0030' and org_id = v_org_id;

  raise notice 'Seed complete — 5 departments, 6 categories, 3 locations, 5 vendors, 50 assets.';
end $$;
