-- Extend audit_action enum with user management actions
-- Run after 006_bulk_assets.sql

ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'invited';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'role_changed';
