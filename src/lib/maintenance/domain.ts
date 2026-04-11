import type { MaintenanceType } from '@/lib/types/maintenance'

import type { CompleteMaintenanceData, MaintenancePorts } from './ports'

export type DomainResult = { error: string } | null

// ---------------------------------------------------------------------------
// Input types (consumed by domain functions — no Supabase, no Zod)
// ---------------------------------------------------------------------------

export type ScheduleInput = {
  title: string
  type: MaintenanceType
  scheduledDate: string
  technicianName: string | null
  notes: string | null
}

export type RetroactiveInput = {
  title: string
  type: MaintenanceType
  scheduledDate: string
  startedAt: string
  completedAt: string
  cost: number | null
  technicianName: string | null
  notes: string | null
}

// ---------------------------------------------------------------------------
// scheduleMaintenance
// Creates a new 'scheduled' maintenance event.
// Rejects if the asset is checked_out or retired, or if an active event
// already exists (domain check — the DB partial unique index is the safety net).
// ---------------------------------------------------------------------------

export async function scheduleMaintenance(
  orgId: string,
  assetId: string,
  input: ScheduleInput,
  createdBy: string,
  ports: MaintenancePorts
): Promise<DomainResult> {
  const asset = await ports.repo.getAsset(assetId)
  if (!asset) return { error: 'Asset not found.' }

  if (asset.status === 'checked_out') {
    return { error: 'Return the asset before scheduling maintenance.' }
  }
  if (asset.status === 'retired') {
    return { error: 'Cannot schedule maintenance on a retired asset.' }
  }

  const existing = await ports.repo.getActiveEvent(assetId)
  if (existing) {
    return { error: 'This asset already has an active maintenance event.' }
  }

  await ports.repo.insertEvent({
    orgId,
    assetId,
    title: input.title,
    type: input.type,
    status: 'scheduled',
    scheduledDate: input.scheduledDate,
    startedAt: null,
    completedAt: null,
    cost: null,
    technicianName: input.technicianName,
    notes: input.notes,
    createdBy,
  })

  await ports.audit.log({
    entityType: 'asset',
    entityId: assetId,
    entityName: asset.name,
    action: 'maintenance_scheduled',
    changes: { title: { old: null, new: input.title } },
  })

  return null
}

// ---------------------------------------------------------------------------
// logRetroactiveMaintenance
// Creates a 'completed' event with past dates — for recording work that
// already happened. startedAt is required so duration is never ambiguous.
// Rejects if an active event already exists.
// ---------------------------------------------------------------------------

export async function logRetroactiveMaintenance(
  orgId: string,
  assetId: string,
  input: RetroactiveInput,
  createdBy: string,
  ports: MaintenancePorts
): Promise<DomainResult> {
  const asset = await ports.repo.getAsset(assetId)
  if (!asset) return { error: 'Asset not found.' }

  // Retroactive entries skip straight to completed — no status conflict
  // with checked_out or retired since we are not changing asset status.
  const existing = await ports.repo.getActiveEvent(assetId)
  if (existing) {
    return { error: 'This asset already has an active maintenance event.' }
  }

  await ports.repo.insertEvent({
    orgId,
    assetId,
    title: input.title,
    type: input.type,
    status: 'completed',
    scheduledDate: input.scheduledDate,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    cost: input.cost,
    technicianName: input.technicianName,
    notes: input.notes,
    createdBy,
  })

  await ports.audit.log({
    entityType: 'asset',
    entityId: assetId,
    entityName: asset.name,
    action: 'maintenance_completed',
    changes: {
      title: { old: null, new: input.title },
      completedAt: { old: null, new: input.completedAt },
    },
  })

  return null
}

// ---------------------------------------------------------------------------
// startMaintenance
// Transitions: scheduled → in_progress.
// Sets asset status to under_maintenance — only if asset is currently active.
// Rejects if asset is checked_out or retired (return it first).
// ---------------------------------------------------------------------------

export async function startMaintenance(
  eventId: string,
  ports: MaintenancePorts
): Promise<DomainResult> {
  const event = await ports.repo.getEvent(eventId)
  if (!event) return { error: 'Maintenance event not found.' }

  if (event.status !== 'scheduled') {
    return { error: 'Only scheduled events can be started.' }
  }

  const asset = await ports.repo.getAsset(event.assetId)
  if (!asset) return { error: 'Asset not found.' }

  if (asset.status === 'checked_out') {
    return { error: 'Return the asset before starting maintenance.' }
  }
  if (asset.status === 'retired') {
    return { error: 'Cannot start maintenance on a retired asset.' }
  }
  if (asset.status !== 'active') {
    return { error: 'Asset must be active before maintenance can begin.' }
  }

  await ports.repo.setEventStatus(eventId, 'in_progress')
  await ports.repo.setAssetStatus(event.assetId, 'under_maintenance')

  await ports.audit.log({
    entityType: 'asset',
    entityId: event.assetId,
    entityName: asset.name,
    action: 'maintenance_started',
    changes: { status: { old: 'active', new: 'under_maintenance' } },
  })

  return null
}

// ---------------------------------------------------------------------------
// completeMaintenance
// Transitions: in_progress → completed.
// Sets asset status back to active — only if currently under_maintenance.
// Does not overwrite checked_out (guards against concurrent state changes).
// ---------------------------------------------------------------------------

export async function completeMaintenance(
  eventId: string,
  input: CompleteMaintenanceData,
  ports: MaintenancePorts
): Promise<DomainResult> {
  const event = await ports.repo.getEvent(eventId)
  if (!event) return { error: 'Maintenance event not found.' }

  if (event.status !== 'in_progress') {
    return { error: 'Only in-progress events can be completed.' }
  }

  const asset = await ports.repo.getAsset(event.assetId)
  if (!asset) return { error: 'Asset not found.' }

  await ports.repo.completeEvent(eventId, input)

  // Only restore to active if still under_maintenance — do not overwrite
  // if the asset was concurrently moved to another status (e.g. checked_out).
  if (asset.status === 'under_maintenance') {
    await ports.repo.setAssetStatus(event.assetId, 'active')
  }

  await ports.audit.log({
    entityType: 'asset',
    entityId: event.assetId,
    entityName: asset.name,
    action: 'maintenance_completed',
    changes: {
      status: { old: 'under_maintenance', new: 'active' },
      ...(input.cost != null ? { cost: { old: null, new: input.cost } } : {}),
    },
  })

  return null
}
