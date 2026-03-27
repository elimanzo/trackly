-- Add report_config column to organizations
-- Run after 003_org_config_columns.sql

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS report_config jsonb NOT NULL DEFAULT '{}';
