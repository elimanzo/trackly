import type { AssetStatus } from '@/lib/types'
import type { MaintenanceStatus } from '@/lib/types/maintenance'

// ---------------------------------------------------------------------------
// Shared record types — camelCase, no Supabase noise
// ---------------------------------------------------------------------------

export type MaintenanceAssetRecord = {
  id: string
  name: string
  status: AssetStatus
}

export type MaintenanceEventRecord = {
  id: string
  assetId: string
  status: MaintenanceStatus
  title: string
  createdBy: string | null
}

export type InsertMaintenanceData = {
  orgId: string
  assetId: string
  title: string
  type: string
  status: MaintenanceStatus
  scheduledDate: string
  startedAt: string | null
  completedAt: string | null
  cost: number | null
  technicianName: string | null
  notes: string | null
  createdBy: string
}

export type CompleteMaintenanceData = {
  completedAt: string
  cost: number | null
  technicianName: string | null
  notes: string | null
}

export type UpdateMaintenanceData = {
  title: string
  type: string
  scheduledDate: string
  cost: number | null
  technicianName: string | null
  notes: string | null
}

export type MaintenanceAuditPayload = {
  entityType: 'asset'
  entityId: string
  entityName: string
  action:
    | 'maintenance_scheduled'
    | 'maintenance_started'
    | 'maintenance_completed'
    | 'maintenance_updated'
    | 'maintenance_deleted'
  changes: Record<string, { old: unknown; new: unknown }> | null
}

// ---------------------------------------------------------------------------
// Ports
// ---------------------------------------------------------------------------

export interface MaintenanceRepository {
  getAsset(assetId: string): Promise<MaintenanceAssetRecord | null>
  getEvent(eventId: string): Promise<MaintenanceEventRecord | null>
  getActiveEvent(assetId: string): Promise<MaintenanceEventRecord | null>

  insertEvent(data: InsertMaintenanceData): Promise<{ id: string }>
  setEventStatus(eventId: string, status: MaintenanceStatus): Promise<void>
  completeEvent(eventId: string, data: CompleteMaintenanceData): Promise<void>
  updateEvent(eventId: string, data: UpdateMaintenanceData): Promise<void>
  softDeleteEvent(eventId: string): Promise<void>
  setAssetStatus(assetId: string, status: AssetStatus): Promise<void>
}

export interface MaintenanceAuditPort {
  /** Fire-and-forget — implementors must never throw. */
  log(payload: MaintenanceAuditPayload): Promise<void>
}

export type MaintenancePorts = {
  repo: MaintenanceRepository
  audit: MaintenanceAuditPort
}
