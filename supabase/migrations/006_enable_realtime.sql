-- Enable Supabase realtime for tables that the OrgDataProvider subscribes to.
-- Without this, postgres_changes events are never emitted and the UI only
-- updates on a full page refresh.

ALTER PUBLICATION supabase_realtime
  ADD TABLE departments,
           categories,
           locations,
           vendors,
           profiles,
           invites,
           user_departments;

-- REPLICA IDENTITY FULL lets realtime send old row values on UPDATE/DELETE,
-- which means Supabase can filter change events by org_id server-side.
ALTER TABLE departments    REPLICA IDENTITY FULL;
ALTER TABLE categories     REPLICA IDENTITY FULL;
ALTER TABLE locations      REPLICA IDENTITY FULL;
ALTER TABLE vendors        REPLICA IDENTITY FULL;
ALTER TABLE profiles       REPLICA IDENTITY FULL;
ALTER TABLE invites        REPLICA IDENTITY FULL;
ALTER TABLE user_departments REPLICA IDENTITY FULL;
