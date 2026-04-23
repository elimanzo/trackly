-- ============================================================
-- Add 'reserved' to asset_status enum
-- ============================================================

alter type public.asset_status add value if not exists 'reserved';
