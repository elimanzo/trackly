-- ============================================================
-- Server-side aggregation functions
--
-- Replaces two client-side full-table-scan patterns:
--
--  1. get_dashboard_aggregates — useDashboardStats was fetching
--     every asset row and aggregating totals/breakdowns in JS.
--     This function returns a single JSONB object with all
--     aggregates computed in Postgres.
--
--  2. get_tag_prefixes — getTagPrefixes (server action) was
--     fetching every asset_tag and extracting prefixes in JS.
--     This function returns distinct prefixes via a single
--     regexp_replace GROUP BY.
-- ============================================================

-- ============================================================
-- 1. get_dashboard_aggregates
--
-- Returns JSONB:
--   total_assets   int
--   total_value    numeric
--   by_status      [{status, count}]
--   by_department  [{department_id, department_name, count, value}]
--
-- Security: security definer (bypasses asset RLS so admins see
-- org-wide stats, not just their department slice). Membership
-- is verified inside the function via user_org_memberships.
-- Returns null if the caller is not an org member.
-- ============================================================

create or replace function public.get_dashboard_aggregates(p_org_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Allow service_role calls (auth.uid() is null) to pass through.
  -- Authenticated callers must be org members.
  if (select auth.uid()) is not null
    and not exists (
      select 1 from public.user_org_memberships
      where user_id = (select auth.uid())
        and org_id  = p_org_id
    )
  then
    return null;
  end if;

  return (
    with asset_rows as (
      select status, department_id, purchase_cost
      from   public.assets
      where  org_id     = p_org_id
        and  deleted_at is null
    ),
    by_status as (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('status', status, 'count', cnt)
          order by cnt desc
        ),
        '[]'::jsonb
      ) as data
      from (
        select status, count(*) as cnt
        from   asset_rows
        group  by status
      ) s
    ),
    by_department as (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'department_id',   coalesce(a.department_id::text, '__none__'),
            'department_name', coalesce(d.name, 'Unassigned'),
            'count',           a.cnt,
            'value',           a.val
          )
          order by a.cnt desc
        ),
        '[]'::jsonb
      ) as data
      from (
        select department_id,
               count(*)                          as cnt,
               coalesce(sum(purchase_cost), 0)   as val
        from   asset_rows
        group  by department_id
      ) a
      left join public.departments d on d.id = a.department_id
    )
    select jsonb_build_object(
      'total_assets',   (select count(*)                        from asset_rows),
      'total_value',    (select coalesce(sum(purchase_cost), 0) from asset_rows),
      'by_status',      (select data from by_status),
      'by_department',  (select data from by_department)
    )
  );
end;
$$;

grant execute on function public.get_dashboard_aggregates(uuid) to authenticated, service_role;

-- ============================================================
-- 2. get_tag_prefixes
--
-- Returns sorted distinct tag prefixes for an org.
-- "LAPTOP-003" → "LAPTOP", "MY-PC-001" → "MY-PC"
-- (splits on the last hyphen, same logic as the JS implementation)
--
-- Security: server-side only (called via admin client).
-- Granted only to service_role.
-- ============================================================

create or replace function public.get_tag_prefixes(p_org_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(
      distinct regexp_replace(asset_tag, '-[^-]*$', '')
      order   by regexp_replace(asset_tag, '-[^-]*$', '')
    ),
    '{}'::text[]
  )
  from public.assets
  where org_id     = p_org_id
    and deleted_at is null
    and asset_tag like '%-%'
$$;

revoke all  on function public.get_tag_prefixes(uuid) from public, anon, authenticated;
grant execute on function public.get_tag_prefixes(uuid) to service_role;
