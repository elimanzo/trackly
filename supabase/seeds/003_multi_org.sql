-- ============================================================
-- Seed 003: Multi-org edge cases
-- Run after seeds/001 and 002.
-- Idempotent — cleans up and re-inserts on every reset.
--
-- ┌──────────────────────────────────────────────────────────────────────┐
-- │  USERS (password: Dev1234! — same as seed 001)                       │
-- ├────────────────────────┬─────────────────────────────────────────────┤
-- │  owner@acme.dev        │  Alex Rivera    Org1:owner  Org2:editor     │
-- │  admin@acme.dev        │  Sarah Mitchell Org1:admin  Org3:owner      │
-- │  editor@acme.dev       │  James Thornton Org1:editor Org2:admin      │
-- │                        │                             Org3:editor     │
-- │  viewer@acme.dev       │  Maria Chen     Org1:viewer pending→Org2    │
-- │  newuser@dev.test      │  (User D)       no org membership           │
-- │  soleowner@dev.test    │  (User F)       Org4:owner (sole member)    │
-- └────────────────────────┴─────────────────────────────────────────────┘
--
-- ┌──────────────────────────────────────────────────────────────────────┐
-- │  ORGS                                                                │
-- ├────────────────────────┬─────────────────────────────────────────────┤
-- │  acme-corp  (Org 1)    │  Full dataset — created by seed 001          │
-- │  techflow-inc (Org 2)  │  Partial dataset, overlapping users          │
-- │  meridian-labs (Org 3) │  Empty org — no assets                       │
-- │  solo-ventures (Org 4) │  Sole-owner org — User F only                │
-- └────────────────────────┴─────────────────────────────────────────────┘
--
-- ┌──────────────────────────────────────────────────────────────────────┐
-- │  INVITES                                                             │
-- ├────────────────────────┬─────────────────────────────────────────────┤
-- │  viewer@acme.dev       │  Pending invite to Org 2 (authenticated      │
-- │                        │  accept path — User E)                       │
-- │  recruit@external.com  │  Pending invite to Org 2 (new-user           │
-- │                        │  unauthenticated accept path)                │
-- │  old@expired.com       │  Expired invite to Org 2                     │
-- └────────────────────────┴─────────────────────────────────────────────┘
-- ============================================================

do $$
declare
  -- ── Existing user UUIDs (from seed 001) ───────────────────
  u_owner  uuid := '00000000-0000-0000-0000-000000000011'; -- Alex Rivera
  u_admin  uuid := '00000000-0000-0000-0000-000000000012'; -- Sarah Mitchell
  u_editor uuid := '00000000-0000-0000-0000-000000000013'; -- James Thornton
  u_viewer uuid := '00000000-0000-0000-0000-000000000014'; -- Maria Chen

  -- ── New user UUIDs ─────────────────────────────────────────
  u_user_d uuid := '00000000-0000-0000-0000-000000000015'; -- User D (no org)
  u_user_f uuid := '00000000-0000-0000-0000-000000000016'; -- User F (sole owner Org 4)

  -- ── New org UUIDs ──────────────────────────────────────────
  v_org2   uuid := '00000000-0000-0000-0000-000000000002'; -- TechFlow Inc
  v_org3   uuid := '00000000-0000-0000-0000-000000000003'; -- Meridian Labs
  v_org4   uuid := '00000000-0000-0000-0000-000000000004'; -- Solo Ventures

  -- ── Org 2 departments ──────────────────────────────────────
  d2_eng   uuid := gen_random_uuid();
  d2_prod  uuid := gen_random_uuid();
  d2_sales uuid := gen_random_uuid();

  -- ── Org 2 categories ───────────────────────────────────────
  c2_laptops uuid := gen_random_uuid();
  c2_monitors uuid := gen_random_uuid();
  c2_periph  uuid := gen_random_uuid();

  -- ── Org 2 locations ────────────────────────────────────────
  l2_office  uuid := gen_random_uuid();
  l2_remote  uuid := gen_random_uuid();

  -- ── Org 2 vendors ──────────────────────────────────────────
  v2_apple   uuid := gen_random_uuid();
  v2_lenovo  uuid := gen_random_uuid();
  v2_lg      uuid := gen_random_uuid();

begin

  -- ── CLEANUP (bottom-up) ───────────────────────────────────

  -- Org 2
  delete from public.asset_assignments
    where asset_id in (select id from public.assets where org_id = v_org2);
  delete from public.assets          where org_id = v_org2;
  delete from public.departments     where org_id = v_org2;
  delete from public.categories      where org_id = v_org2;
  delete from public.locations       where org_id = v_org2;
  delete from public.vendors         where org_id = v_org2;
  delete from public.invites         where org_id = v_org2;
  delete from public.user_departments where org_id = v_org2;
  delete from public.user_org_memberships where org_id = v_org2;
  delete from public.organizations   where id = v_org2;

  -- Org 3 (no assets)
  delete from public.invites         where org_id = v_org3;
  delete from public.user_departments where org_id = v_org3;
  delete from public.user_org_memberships where org_id = v_org3;
  delete from public.organizations   where id = v_org3;

  -- Org 4 (no assets)
  delete from public.user_org_memberships where org_id = v_org4;
  delete from public.organizations   where id = v_org4;

  -- New users
  delete from public.profiles where id in (u_user_d, u_user_f);
  delete from auth.users      where id in (u_user_d, u_user_f);


  -- ── AUTH USERS (new) ──────────────────────────────────────

  -- User D: signed up, no org yet
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', u_user_d, 'authenticated', 'authenticated',
      'newuser@dev.test', crypt('Dev1234!', gen_salt('bf')),
      now(), '{"full_name":"Dana Park"}', '{"provider":"email","providers":["email"]}',
      now(), now(), '', '', '', ''),

    ('00000000-0000-0000-0000-000000000000', u_user_f, 'authenticated', 'authenticated',
      'soleowner@dev.test', crypt('Dev1234!', gen_salt('bf')),
      now(), '{"full_name":"Frank Sole"}', '{"provider":"email","providers":["email"]}',
      now(), now(), '', '', '', '');


  -- ── ORGANIZATIONS ─────────────────────────────────────────

  -- Org 2: TechFlow Inc — partial dataset, shared members with Org 1
  insert into public.organizations (id, name, slug, owner_id)
  values (v_org2, 'TechFlow Inc', 'techflow-inc', u_editor); -- James is owner

  -- Org 3: Meridian Labs — empty org (no assets), Sarah owns it
  insert into public.organizations (id, name, slug, owner_id)
  values (v_org3, 'Meridian Labs', 'meridian-labs', u_admin);

  -- Org 4: Solo Ventures — User F is sole owner and sole member
  insert into public.organizations (id, name, slug, owner_id)
  values (v_org4, 'Solo Ventures', 'solo-ventures', u_user_f);


  -- ── ORG MEMBERSHIPS ───────────────────────────────────────

  -- Org 2: Alex (editor), James (owner/admin role stored as admin per issue)
  -- Note: James owns the org but the issue calls him 'admin' in Org 2 — owner
  -- is stored on organizations.owner_id; the membership role is 'owner' to match.
  insert into public.user_org_memberships (user_id, org_id, role, invite_status) values
    (u_editor, v_org2, 'owner',  'active'), -- James Thornton — org owner
    (u_owner,  v_org2, 'editor', 'active'); -- Alex Rivera

  -- Org 3: Sarah (owner), James (editor)
  insert into public.user_org_memberships (user_id, org_id, role, invite_status) values
    (u_admin,  v_org3, 'owner',  'active'), -- Sarah Mitchell
    (u_editor, v_org3, 'editor', 'active'); -- James Thornton

  -- Org 4: User F only
  insert into public.user_org_memberships (user_id, org_id, role, invite_status) values
    (u_user_f, v_org4, 'owner', 'active');

  -- User D has no memberships — no insert needed.


  -- ── ORG 2 — DEPARTMENTS ───────────────────────────────────
  insert into public.departments (id, org_id, name, description) values
    (d2_eng,   v_org2, 'Engineering', 'Product engineering, infrastructure, and QA'),
    (d2_prod,  v_org2, 'Product',     'Product management, design, and research'),
    (d2_sales, v_org2, 'Sales',       'Sales, account management, and business development');

  -- James (editor in Org 1, but owner/admin in Org 2) → Engineering + Product
  insert into public.user_departments (user_id, department_id, org_id) values
    (u_editor, d2_eng,  v_org2),
    (u_editor, d2_prod, v_org2);

  -- Alex (editor in Org 2) → Sales
  insert into public.user_departments (user_id, department_id, org_id) values
    (u_owner, d2_sales, v_org2);


  -- ── ORG 2 — CATEGORIES ────────────────────────────────────
  insert into public.categories (id, org_id, name, description) values
    (c2_laptops,  v_org2, 'Laptops',               'Developer and designer workstations'),
    (c2_monitors, v_org2, 'Monitors',               'External displays'),
    (c2_periph,   v_org2, 'Accessories',            'Keyboards, mice, cables, and hubs');


  -- ── ORG 2 — LOCATIONS ─────────────────────────────────────
  insert into public.locations (id, org_id, name, description) values
    (l2_office, v_org2, 'TechFlow HQ', 'Main office — open floor plan'),
    (l2_remote, v_org2, 'Remote',      'Equipment at remote employee home offices');


  -- ── ORG 2 — VENDORS ───────────────────────────────────────
  insert into public.vendors (id, org_id, name, contact_email, website) values
    (v2_apple,  v_org2, 'Apple',   'business@apple.com', 'apple.com/business'),
    (v2_lenovo, v_org2, 'Lenovo',  'sales@lenovo.com',   'lenovo.com/business'),
    (v2_lg,     v_org2, 'LG',      'b2b@lg.com',         'lg.com/business');


  -- ── ORG 2 — ASSETS ────────────────────────────────────────
  insert into public.assets (
    org_id, asset_tag, name,
    category_id, department_id, location_id, vendor_id,
    status, purchase_date, purchase_cost, warranty_expiry,
    notes, created_by
  ) values
    (v_org2, 'TF-0001', 'MacBook Pro 16" (M3 Max)',
      c2_laptops, d2_eng, l2_office, v2_apple,
      'active', '2024-02-01', 3499.00, '2027-02-01',
      'Lead engineer workstation', u_editor),

    (v_org2, 'TF-0002', 'MacBook Pro 14" (M3 Pro)',
      c2_laptops, d2_eng, l2_remote, v2_apple,
      'checked_out', '2024-03-01', 1999.00, '2027-03-01',
      null, u_editor),

    (v_org2, 'TF-0003', 'Lenovo ThinkPad X1 Carbon',
      c2_laptops, d2_prod, l2_office, v2_lenovo,
      'active', '2023-11-15', 1649.00, '2026-11-15',
      null, u_editor),

    (v_org2, 'TF-0004', 'Lenovo ThinkPad X1 Carbon',
      c2_laptops, d2_sales, l2_remote, v2_lenovo,
      'active', '2023-11-15', 1649.00, '2026-11-15',
      null, u_editor),

    (v_org2, 'TF-0005', 'LG UltraFine 5K 27"',
      c2_monitors, d2_eng, l2_office, v2_lg,
      'active', '2024-01-10', 1299.00, '2027-01-10',
      null, u_editor),

    (v_org2, 'TF-0006', 'LG UltraFine 5K 27"',
      c2_monitors, d2_prod, l2_office, v2_lg,
      'active', '2024-01-10', 1299.00, '2027-01-10',
      null, u_editor),

    (v_org2, 'TF-0007', 'LG 27" 4K USB-C',
      c2_monitors, d2_sales, l2_remote, v2_lg,
      'active', '2023-09-01', 499.00, '2026-09-01',
      null, u_editor),

    (v_org2, 'TF-0008', 'MacBook Air 13" (M2)',
      c2_laptops, d2_sales, l2_remote, v2_apple,
      'under_maintenance', '2022-10-01', 1099.00, '2025-10-01',
      'Keyboard replacement', u_editor),

    (v_org2, 'TF-0009', 'MacBook Pro 13" (Intel, 2020)',
      c2_laptops, d2_eng, l2_office, v2_apple,
      'retired', '2020-06-01', 1299.00, '2023-06-01',
      'Replaced — awaiting data wipe', u_editor),

    (v_org2, 'TF-0010', 'LG 32" Curved Monitor',
      c2_monitors, d2_eng, l2_office, v2_lg,
      'in_storage', '2021-04-01', 599.00, '2024-04-01',
      'Spare — older model', u_editor);

  -- TF-0002 checked out to Alex (editor in Org 2)
  insert into public.asset_assignments (
    asset_id, assigned_to_user_id, assigned_to_name,
    assigned_by, assigned_by_name, assigned_at, expected_return_at
  )
  select id, u_owner, 'Alex Rivera', u_editor, 'James Thornton',
    now() - interval '10 days', now() + interval '20 days'
  from public.assets where asset_tag = 'TF-0002' and org_id = v_org2;


  -- ── INVITES ───────────────────────────────────────────────

  -- 1. Pending invite for Maria Chen (User E) to Org 2 — authenticated accept path
  insert into public.invites (
    org_id, email, role, token, invited_by, invited_by_name,
    expires_at, department_ids
  ) values (
    v_org2,
    'viewer@acme.dev',
    'viewer',
    '00000000-0000-0000-0001-000000000001',
    u_editor,
    'James Thornton',
    now() + interval '7 days',
    '[]'
  );

  -- 2. Pending invite for a net-new email — unauthenticated (new-user) accept path
  insert into public.invites (
    org_id, email, role, token, invited_by, invited_by_name,
    expires_at, department_ids
  ) values (
    v_org2,
    'recruit@external.com',
    'editor',
    '00000000-0000-0000-0001-000000000002',
    u_editor,
    'James Thornton',
    now() + interval '7 days',
    jsonb_build_array(d2_eng)
  );

  -- 3. Expired invite — tests the "invite not found or has expired" path
  insert into public.invites (
    org_id, email, role, token, invited_by, invited_by_name,
    expires_at, department_ids
  ) values (
    v_org2,
    'old@expired.com',
    'viewer',
    '00000000-0000-0000-0001-000000000003',
    u_editor,
    'James Thornton',
    now() - interval '30 days',
    '[]'
  );


  raise notice 'Seed 003 complete — 2 new users, 3 new orgs, 10 Org2 assets, 3 invites.';
end $$;
