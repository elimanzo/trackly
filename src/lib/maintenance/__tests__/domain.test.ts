import { beforeEach, describe, expect, it } from 'vitest'

import type { AssetId, EventId, OrgId, UserId } from '@/lib/types'

import {
  completeMaintenance,
  logRetroactiveMaintenance,
  scheduleMaintenance,
  startMaintenance,
} from '../domain'
import type { MaintenancePorts } from '../ports'

import { InMemoryMaintenanceRepo, SpyMaintenanceAuditPort } from './fakes'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORG_ID = 'org-001' as OrgId
const ASSET_ID = 'asset-001' as AssetId
const USER_ID = 'user-001' as UserId
const EVENT_ID = 'evt-001' as EventId

function makePorts(
  repo: InMemoryMaintenanceRepo,
  audit = new SpyMaintenanceAuditPort()
): MaintenancePorts {
  return { repo, audit }
}

function makeScheduleInput(overrides = {}) {
  return {
    title: 'Annual inspection',
    type: 'inspection' as const,
    scheduledDate: '2026-05-01',
    technicianName: null,
    notes: null,
    ...overrides,
  }
}

function makeRetroactiveInput(overrides = {}) {
  return {
    title: 'Screen replacement',
    type: 'corrective' as const,
    scheduledDate: '2026-03-01',
    startedAt: '2026-03-01T09:00:00Z',
    completedAt: '2026-03-01T11:00:00Z',
    cost: 150,
    technicianName: 'Bob',
    notes: 'Replaced cracked screen',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// scheduleMaintenance
// ---------------------------------------------------------------------------

describe('scheduleMaintenance', () => {
  let repo: InMemoryMaintenanceRepo
  let audit: SpyMaintenanceAuditPort

  beforeEach(() => {
    repo = new InMemoryMaintenanceRepo()
    audit = new SpyMaintenanceAuditPort()
  })

  it('returns error when asset is not found', async () => {
    const result = await scheduleMaintenance(
      ORG_ID,
      'nonexistent' as AssetId,
      makeScheduleInput(),
      USER_ID,
      makePorts(repo, audit)
    )
    expect(result).toEqual({ error: 'Asset not found.' })
  })

  it('returns error when asset is checked_out', async () => {
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'checked_out' })
    const result = await scheduleMaintenance(
      ORG_ID,
      ASSET_ID,
      makeScheduleInput(),
      USER_ID,
      makePorts(repo, audit)
    )
    expect(result).toEqual({ error: 'Return the asset before scheduling maintenance.' })
  })

  it('returns error when asset is retired', async () => {
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'retired' })
    const result = await scheduleMaintenance(
      ORG_ID,
      ASSET_ID,
      makeScheduleInput(),
      USER_ID,
      makePorts(repo, audit)
    )
    expect(result).toEqual({ error: 'Cannot schedule maintenance on a retired asset.' })
  })

  it('returns error when maintenance is already in progress', async () => {
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'under_maintenance' })
    repo.seedEvent({
      id: 'evt-existing',
      orgId: ORG_ID,
      assetId: ASSET_ID,
      title: 'Existing',
      type: 'inspection',
      status: 'in_progress',
      scheduledDate: '2026-04-01',
      startedAt: '2026-04-01T09:00:00Z',
      completedAt: null,
      cost: null,
      technicianName: null,
      notes: null,
      createdBy: USER_ID,
      deletedAt: null,
    })

    const result = await scheduleMaintenance(
      ORG_ID,
      ASSET_ID,
      makeScheduleInput(),
      USER_ID,
      makePorts(repo, audit)
    )
    expect(result).toEqual({ error: 'This asset already has maintenance in progress.' })
  })

  it('allows scheduling a second event when one is already scheduled', async () => {
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'active' })
    repo.seedEvent({
      id: 'evt-existing',
      orgId: ORG_ID,
      assetId: ASSET_ID,
      title: 'Oil change',
      type: 'preventive',
      status: 'scheduled',
      scheduledDate: '2026-05-01',
      startedAt: null,
      completedAt: null,
      cost: null,
      technicianName: null,
      notes: null,
      createdBy: USER_ID,
      deletedAt: null,
    })

    const result = await scheduleMaintenance(
      ORG_ID,
      ASSET_ID,
      makeScheduleInput({ title: 'Annual inspection', scheduledDate: '2026-06-01' }),
      USER_ID,
      makePorts(repo, audit)
    )
    expect(result).toBeNull()
    expect(repo.events.size).toBe(2)
  })

  it('creates a scheduled event and logs audit on success', async () => {
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'active' })
    const result = await scheduleMaintenance(
      ORG_ID,
      ASSET_ID,
      makeScheduleInput(),
      USER_ID,
      makePorts(repo, audit)
    )

    expect(result).toBeNull()
    expect(repo.events.size).toBe(1)
    const event = [...repo.events.values()][0]!
    expect(event.status).toBe('scheduled')
    expect(event.title).toBe('Annual inspection')
    expect(audit.calls).toHaveLength(1)
    expect(audit.calls[0]!).toMatchObject({
      action: 'maintenance_scheduled',
      entityId: ASSET_ID,
    })
  })

  it('does not change asset status when scheduling', async () => {
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'active' })
    await scheduleMaintenance(
      ORG_ID,
      ASSET_ID,
      makeScheduleInput(),
      USER_ID,
      makePorts(repo, audit)
    )
    expect(repo.assetStatuses.get(ASSET_ID)).toBe('active')
  })

  it('allows scheduling on assets in other non-blocked statuses (e.g. in_storage)', async () => {
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'in_storage' })
    const result = await scheduleMaintenance(
      ORG_ID,
      ASSET_ID,
      makeScheduleInput(),
      USER_ID,
      makePorts(repo, audit)
    )
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// logRetroactiveMaintenance
// ---------------------------------------------------------------------------

describe('logRetroactiveMaintenance', () => {
  let repo: InMemoryMaintenanceRepo
  let audit: SpyMaintenanceAuditPort

  beforeEach(() => {
    repo = new InMemoryMaintenanceRepo()
    audit = new SpyMaintenanceAuditPort()
  })

  it('creates a completed event with all provided fields', async () => {
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'active' })
    const result = await logRetroactiveMaintenance(
      ORG_ID,
      ASSET_ID,
      makeRetroactiveInput(),
      USER_ID,
      makePorts(repo, audit)
    )

    expect(result).toBeNull()
    const event = [...repo.events.values()][0]!
    expect(event.status).toBe('completed')
    expect(event.startedAt).toBe('2026-03-01T09:00:00Z')
    expect(event.completedAt).toBe('2026-03-01T11:00:00Z')
    expect(event.cost).toBe(150)
    expect(audit.calls[0]!.action).toBe('maintenance_completed')
  })

  it('returns error when asset is not found', async () => {
    const result = await logRetroactiveMaintenance(
      ORG_ID,
      'nonexistent' as AssetId,
      makeRetroactiveInput(),
      USER_ID,
      makePorts(repo, audit)
    )
    expect(result).toEqual({ error: 'Asset not found.' })
  })

  it('returns error when an active event already exists', async () => {
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'active' })
    repo.seedEvent({
      id: 'evt-existing',
      orgId: ORG_ID,
      assetId: ASSET_ID,
      title: 'Existing',
      type: 'inspection',
      status: 'in_progress',
      scheduledDate: '2026-04-01',
      startedAt: '2026-04-01T09:00:00Z',
      completedAt: null,
      cost: null,
      technicianName: null,
      notes: null,
      createdBy: USER_ID,
      deletedAt: null,
    })

    const result = await logRetroactiveMaintenance(
      ORG_ID,
      ASSET_ID,
      makeRetroactiveInput(),
      USER_ID,
      makePorts(repo, audit)
    )
    expect(result).toEqual({ error: 'This asset already has maintenance in progress.' })
  })

  it('does not change asset status for retroactive entries', async () => {
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'checked_out' })
    const result = await logRetroactiveMaintenance(
      ORG_ID,
      ASSET_ID,
      makeRetroactiveInput(),
      USER_ID,
      makePorts(repo, audit)
    )
    // Retroactive entries skip status checks — work already happened
    expect(result).toBeNull()
    expect(repo.assetStatuses.get(ASSET_ID)).toBe('checked_out')
  })
})

// ---------------------------------------------------------------------------
// startMaintenance
// ---------------------------------------------------------------------------

describe('startMaintenance', () => {
  let repo: InMemoryMaintenanceRepo
  let audit: SpyMaintenanceAuditPort

  beforeEach(() => {
    repo = new InMemoryMaintenanceRepo()
    audit = new SpyMaintenanceAuditPort()
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'active' })
  })

  function seedScheduledEvent() {
    repo.seedEvent({
      id: 'evt-001',
      orgId: ORG_ID,
      assetId: ASSET_ID,
      title: 'Annual inspection',
      type: 'inspection',
      status: 'scheduled',
      scheduledDate: '2026-05-01',
      startedAt: null,
      completedAt: null,
      cost: null,
      technicianName: null,
      notes: null,
      createdBy: USER_ID,
      deletedAt: null,
    })
  }

  it('returns error when event is not found', async () => {
    const result = await startMaintenance('nonexistent' as EventId, makePorts(repo, audit))
    expect(result).toEqual({ error: 'Maintenance event not found.' })
  })

  it('returns error when event is not scheduled', async () => {
    repo.seedEvent({
      id: 'evt-001',
      orgId: ORG_ID,
      assetId: ASSET_ID,
      title: 'Inspection',
      type: 'inspection',
      status: 'completed',
      scheduledDate: '2026-05-01',
      startedAt: '2026-05-01T09:00:00Z',
      completedAt: '2026-05-01T11:00:00Z',
      cost: null,
      technicianName: null,
      notes: null,
      createdBy: USER_ID,
      deletedAt: null,
    })
    const result = await startMaintenance(EVENT_ID, makePorts(repo, audit))
    expect(result).toEqual({ error: 'Only scheduled events can be started.' })
  })

  it('returns error when asset is checked_out', async () => {
    seedScheduledEvent()
    repo.assetStatuses.set(ASSET_ID, 'checked_out')
    const result = await startMaintenance(EVENT_ID, makePorts(repo, audit))
    expect(result).toEqual({ error: 'Return the asset before starting maintenance.' })
  })

  it('returns error when asset is retired', async () => {
    seedScheduledEvent()
    repo.assetStatuses.set(ASSET_ID, 'retired')
    const result = await startMaintenance(EVENT_ID, makePorts(repo, audit))
    expect(result).toEqual({ error: 'Cannot start maintenance on a retired asset.' })
  })

  it('sets event to in_progress and asset to under_maintenance on success', async () => {
    seedScheduledEvent()
    const result = await startMaintenance(EVENT_ID, makePorts(repo, audit))

    expect(result).toBeNull()
    expect(repo.events.get('evt-001')!.status).toBe('in_progress')
    expect(repo.assetStatuses.get(ASSET_ID)).toBe('under_maintenance')
    expect(audit.calls[0]!).toMatchObject({
      action: 'maintenance_started',
      entityId: ASSET_ID,
    })
  })
})

// ---------------------------------------------------------------------------
// completeMaintenance
// ---------------------------------------------------------------------------

describe('completeMaintenance', () => {
  let repo: InMemoryMaintenanceRepo
  let audit: SpyMaintenanceAuditPort

  beforeEach(() => {
    repo = new InMemoryMaintenanceRepo()
    audit = new SpyMaintenanceAuditPort()
    repo.seedAsset({ id: ASSET_ID, name: 'Laptop', status: 'under_maintenance' })
    repo.seedEvent({
      id: 'evt-001',
      orgId: ORG_ID,
      assetId: ASSET_ID,
      title: 'Annual inspection',
      type: 'inspection',
      status: 'in_progress',
      scheduledDate: '2026-05-01',
      startedAt: '2026-05-01T09:00:00Z',
      completedAt: null,
      cost: null,
      technicianName: null,
      notes: null,
      createdBy: USER_ID,
      deletedAt: null,
    })
  })

  function makeCompleteInput(overrides = {}) {
    return {
      completedAt: '2026-05-01T12:00:00Z',
      cost: 200,
      technicianName: 'Alice',
      notes: 'All clear',
      ...overrides,
    }
  }

  it('returns error when event is not found', async () => {
    const result = await completeMaintenance(
      'nonexistent' as EventId,
      makeCompleteInput(),
      makePorts(repo, audit)
    )
    expect(result).toEqual({ error: 'Maintenance event not found.' })
  })

  it('returns error when event is not in_progress', async () => {
    repo.events.get('evt-001')!.status = 'scheduled'
    const result = await completeMaintenance(EVENT_ID, makeCompleteInput(), makePorts(repo, audit))
    expect(result).toEqual({ error: 'Only in-progress events can be completed.' })
  })

  it('sets event to completed and restores asset to active', async () => {
    const result = await completeMaintenance(EVENT_ID, makeCompleteInput(), makePorts(repo, audit))

    expect(result).toBeNull()
    expect(repo.events.get('evt-001')!.status).toBe('completed')
    expect(repo.assetStatuses.get(ASSET_ID)).toBe('active')
    expect(audit.calls[0]!).toMatchObject({
      action: 'maintenance_completed',
      entityId: ASSET_ID,
    })
  })

  it('persists cost, technicianName, and notes on completion', async () => {
    await completeMaintenance(
      EVENT_ID,
      makeCompleteInput({ cost: 350, technicianName: 'Bob', notes: 'Fixed leak' }),
      makePorts(repo, audit)
    )
    const event = repo.events.get('evt-001')!
    expect(event.cost).toBe(350)
    expect(event.technicianName).toBe('Bob')
    expect(event.notes).toBe('Fixed leak')
  })

  it('does not overwrite asset status if asset is no longer under_maintenance', async () => {
    // Simulate a concurrent state change (e.g. someone manually changed status)
    repo.assetStatuses.set(ASSET_ID, 'checked_out')
    const result = await completeMaintenance(EVENT_ID, makeCompleteInput(), makePorts(repo, audit))

    expect(result).toBeNull()
    // Asset status should not have been touched
    expect(repo.assetStatuses.get(ASSET_ID)).toBe('checked_out')
  })

  it('includes cost in audit changes when provided', async () => {
    await completeMaintenance(EVENT_ID, makeCompleteInput({ cost: 500 }), makePorts(repo, audit))
    expect(audit.calls[0]!.changes).toMatchObject({ cost: { old: null, new: 500 } })
  })

  it('omits cost from audit changes when not provided', async () => {
    await completeMaintenance(EVENT_ID, makeCompleteInput({ cost: null }), makePorts(repo, audit))
    expect(audit.calls[0]!.changes).not.toHaveProperty('cost')
  })
})
