-- Enable Supabase realtime for assets and audit_logs so the UI can
-- invalidate React Query caches when another user makes changes.

ALTER PUBLICATION supabase_realtime
  ADD TABLE assets,
           audit_logs;

-- REPLICA IDENTITY FULL lets realtime filter change events by org_id
-- server-side, same pattern as 008_enable_realtime.sql.
ALTER TABLE assets     REPLICA IDENTITY FULL;
ALTER TABLE audit_logs REPLICA IDENTITY FULL;
