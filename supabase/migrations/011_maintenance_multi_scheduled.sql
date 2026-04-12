-- Relaxes the one-active-event-per-asset constraint so that multiple
-- scheduled events can coexist on the same asset. Only one in_progress
-- event is still enforced — that is the state that drives asset status.
--
-- The original index blocked both scheduled and in_progress simultaneously,
-- which was overly restrictive. The asset-status check in startMaintenance
-- already prevents a second in_progress event from being created (the asset
-- must be active, which it is not while another event is in_progress).

drop index if exists maintenance_events_one_active_per_asset;

create unique index maintenance_events_one_inprogress_per_asset
  on public.maintenance_events (asset_id)
  where status = 'in_progress'
    and deleted_at is null;
