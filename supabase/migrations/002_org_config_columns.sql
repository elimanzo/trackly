-- Add department label and config columns to organizations
-- Run after 002_invite_department_ids.sql

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS department_label text NOT NULL DEFAULT 'Department',
  ADD COLUMN IF NOT EXISTS dashboard_config jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS asset_table_config jsonb NOT NULL DEFAULT '{}';
