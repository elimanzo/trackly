-- Fuzzy asset search using pg_trgm
-- Run after 004_org_report_config.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for fast trigram search on the most-searched columns
CREATE INDEX IF NOT EXISTS assets_name_trgm_idx ON assets USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS assets_tag_trgm_idx  ON assets USING GIN (asset_tag gin_trgm_ops);

-- Returns IDs of assets that match the search term via:
--   • ilike substring match on name, asset_tag, category, location, vendor
--   • trigram similarity on asset name (handles typos / plural forms)
CREATE OR REPLACE FUNCTION search_asset_ids(
  p_org_id uuid,
  p_search text
)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT ARRAY(
    SELECT DISTINCT a.id
    FROM assets a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN locations  l ON a.location_id  = l.id
    LEFT JOIN vendors    v ON a.vendor_id     = v.id
    WHERE
      a.org_id     = p_org_id
      AND a.deleted_at IS NULL
      AND (
        a.name        ILIKE '%' || p_search || '%'
        OR a.asset_tag ILIKE '%' || p_search || '%'
        OR c.name      ILIKE '%' || p_search || '%'
        OR l.name      ILIKE '%' || p_search || '%'
        OR v.name      ILIKE '%' || p_search || '%'
        OR lower(a.name) % lower(p_search)
      )
  )
$$;

GRANT EXECUTE ON FUNCTION search_asset_ids(uuid, text) TO authenticated;
