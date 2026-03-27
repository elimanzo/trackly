-- Bulk / quantity asset tracking
-- Run after 005_asset_search.sql

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS is_bulk   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quantity  integer CHECK (quantity IS NULL OR quantity >= 0);

ALTER TABLE asset_assignments
  ADD COLUMN IF NOT EXISTS quantity      integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_id   uuid REFERENCES locations(id)   ON DELETE SET NULL;
