import type { AssetStatus } from '@/lib/types'
import type { MaintenanceStatus } from '@/lib/types/maintenance'

import type {
  CompleteMaintenanceData,
  InsertMaintenanceData,
  MaintenanceAssetRecord,
  MaintenanceAuditPayload,
  MaintenanceAuditPort,
  MaintenanceEventRecord,
  MaintenanceRepository,
  UpdateMaintenanceData,
} from '../ports'

// ---------------------------------------------------------------------------
// InMemoryMaintenanceRepo
// ---------------------------------------------------------------------------

type StoredAsset = MaintenanceAssetRecord & { status: AssetStatus }

type StoredEvent = MaintenanceEventRecord & {
  orgId: string
  type: string
  scheduledDate: string
  startedAt: string | null
  completedAt: string | null
  cost: number | null
  technicianName: string | null
  notes: string | null
  deletedAt: string | null
}

export class InMemoryMaintenanceRepo implements MaintenanceRepository {
  assets = new Map<string, StoredAsset>()
  events = new Map<string, StoredEvent>()
  assetStatuses = new Map<string, AssetStatus>()
  private nextId = 1

  seedAsset(asset: StoredAsset) {
    this.assets.set(asset.id, { ...asset })
    this.assetStatuses.set(asset.id, asset.status)
  }

  seedEvent(event: StoredEvent) {
    this.events.set(event.id, { ...event })
  }

  async getAsset(assetId: string) {
    const asset = this.assets.get(assetId)
    if (!asset) return null
    // Always read from assetStatuses so setAssetStatus mutations are reflected
    return { ...asset, status: this.assetStatuses.get(assetId) ?? asset.status }
  }

  async getEvent(eventId: string) {
    const event = this.events.get(eventId)
    if (!event || event.deletedAt) return null
    return {
      id: event.id,
      assetId: event.assetId,
      status: event.status,
      title: event.title,
      createdBy: event.createdBy,
    }
  }

  async getInProgressEvent(assetId: string) {
    for (const event of this.events.values()) {
      if (event.assetId === assetId && !event.deletedAt && event.status === 'in_progress') {
        return {
          id: event.id,
          assetId: event.assetId,
          status: event.status,
          title: event.title,
          createdBy: event.createdBy,
        }
      }
    }
    return null
  }

  async insertEvent(data: InsertMaintenanceData) {
    const id = `evt-${this.nextId++}`
    this.events.set(id, {
      id,
      orgId: data.orgId,
      assetId: data.assetId,
      title: data.title,
      type: data.type,
      status: data.status,
      scheduledDate: data.scheduledDate,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      cost: data.cost,
      technicianName: data.technicianName,
      notes: data.notes,
      createdBy: data.createdBy,
      deletedAt: null,
    })
    return { id }
  }

  async setEventStatus(eventId: string, status: MaintenanceStatus) {
    const event = this.events.get(eventId)
    if (event) event.status = status
  }

  async completeEvent(eventId: string, data: CompleteMaintenanceData) {
    const event = this.events.get(eventId)
    if (event) {
      event.status = 'completed'
      event.completedAt = data.completedAt
      event.cost = data.cost
      event.technicianName = data.technicianName
      event.notes = data.notes
    }
  }

  async updateEvent(eventId: string, data: UpdateMaintenanceData) {
    const event = this.events.get(eventId)
    if (event) {
      event.title = data.title
      event.type = data.type
      event.scheduledDate = data.scheduledDate
      event.cost = data.cost
      event.technicianName = data.technicianName
      event.notes = data.notes
    }
  }

  async softDeleteEvent(eventId: string) {
    const event = this.events.get(eventId)
    if (event) event.deletedAt = new Date().toISOString()
  }

  async setAssetStatus(assetId: string, status: AssetStatus) {
    this.assetStatuses.set(assetId, status)
  }
}

// ---------------------------------------------------------------------------
// SpyMaintenanceAuditPort
// ---------------------------------------------------------------------------

export class SpyMaintenanceAuditPort implements MaintenanceAuditPort {
  calls: MaintenanceAuditPayload[] = []
  async log(payload: MaintenanceAuditPayload) {
    this.calls.push(payload)
  }
}
