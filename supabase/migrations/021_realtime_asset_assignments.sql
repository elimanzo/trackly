-- Realtime for asset_assignments.
--
-- Checkout / return / quantity changes live in asset_assignments, but the
-- table was never added to the publication. Other sessions only saw those
-- changes when the write happened to also touch assets.status — which a
-- partial bulk checkout does not do — so assignment changes did not
-- propagate.
--
-- asset_assignments has no org_id column, so the client subscribes to it
-- unfiltered and RLS decides delivery. See UNSCOPED_TABLES in
-- src/lib/hooks/useOrgRealtimeSync.ts.

ALTER PUBLICATION supabase_realtime ADD TABLE asset_assignments;

-- REPLICA IDENTITY FULL: send old row values on UPDATE/DELETE so the realtime
-- server can evaluate RLS against the pre-change row.
ALTER TABLE asset_assignments REPLICA IDENTITY FULL;
