import { beforeEach, describe, expect, it } from 'vitest'

import type { CheckoutFormInput } from '@/lib/types'

import {
  checkoutAsset,
  returnBulkAssignment,
  returnSerializedAsset,
  updateAssignment,
} from '../domain'
import type { CheckoutPorts } from '../ports'

import { InMemoryCheckoutRepo, SpyAuditPort } from './fakes'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ASSET_ID = 'asset-001'
const ACTOR_ID = 'user-001'

function makePorts(repo: InMemoryCheckoutRepo, audit = new SpyAuditPort()): CheckoutPorts {
  return { repo, audit }
}

function makeInput(overrides: Partial<CheckoutFormInput> = {}): CheckoutFormInput {
  return {
    assignedToUserId: 'user-002',
    assignedToName: 'Alice',
    quantity: 1,
    departmentId: null,
    locationId: null,
    expectedReturnAt: null,
    notes: undefined,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// checkoutAsset
// ---------------------------------------------------------------------------

describe('checkoutAsset', () => {
  let repo: InMemoryCheckoutRepo
  let audit: SpyAuditPort

  beforeEach(() => {
    repo = new InMemoryCheckoutRepo()
    audit = new SpyAuditPort()
  })

  it('returns error when asset is not found', async () => {
    const ports = makePorts(repo, audit)
    const result = await checkoutAsset('nonexistent', makeInput(), 'Admin', ACTOR_ID, ports)
    expect(result).toEqual({ error: 'Asset not found.' })
  })

  describe('serialized asset', () => {
    beforeEach(() => {
      repo.seedAsset({
        id: ASSET_ID,
        name: 'Laptop',
        isBulk: false,
        quantity: null,
        departmentId: null,
      })
    })

    it('succeeds and logs audit', async () => {
      const ports = makePorts(repo, audit)
      const result = await checkoutAsset(ASSET_ID, makeInput(), 'Admin', ACTOR_ID, ports)

      expect(result).toBeNull()
      expect(repo.assignments.size).toBe(1)
      expect(audit.calls).toHaveLength(1)
      expect(audit.calls[0]).toMatchObject({
        action: 'checked_out',
        entityId: ASSET_ID,
        changes: { assignedTo: { old: null, new: 'Alice' } },
      })
    })

    it('does not include quantity in audit for serialized checkout', async () => {
      const ports = makePorts(repo, audit)
      await checkoutAsset(ASSET_ID, makeInput(), 'Admin', ACTOR_ID, ports)
      expect(audit.calls[0]!.changes).not.toHaveProperty('quantity')
    })
  })

  describe('bulk asset', () => {
    beforeEach(() => {
      repo.seedAsset({
        id: ASSET_ID,
        name: 'Walkie Talkie',
        isBulk: true,
        quantity: 5,
        departmentId: null,
      })
    })

    it('succeeds and includes quantity in audit', async () => {
      const ports = makePorts(repo, audit)
      const result = await checkoutAsset(
        ASSET_ID,
        makeInput({ quantity: 3 }),
        'Admin',
        ACTOR_ID,
        ports
      )

      expect(result).toBeNull()
      expect(repo.assignments.size).toBe(1)
      expect(audit.calls[0]!.changes).toMatchObject({
        assignedTo: { old: null, new: 'Alice' },
        quantity: { old: null, new: 3 },
      })
    })

    it('rejects when pre-check shows insufficient stock', async () => {
      // Pre-seed two assignments that consume all 5 units
      await repo.insertAssignment({
        assetId: ASSET_ID,
        assignedToUserId: null,
        assignedToName: 'Bob',
        assignedById: 'u1',
        assignedByName: 'Admin',
        quantity: 3,
        departmentId: null,
        locationId: null,
        expectedReturnAt: null,
        notes: null,
      })
      await repo.insertAssignment({
        assetId: ASSET_ID,
        assignedToUserId: null,
        assignedToName: 'Carol',
        assignedById: 'u1',
        assignedByName: 'Admin',
        quantity: 2,
        departmentId: null,
        locationId: null,
        expectedReturnAt: null,
        notes: null,
      })

      const ports = makePorts(repo, audit)
      const result = await checkoutAsset(
        ASSET_ID,
        makeInput({ quantity: 1 }),
        'Admin',
        ACTOR_ID,
        ports
      )

      expect(result).toEqual({ error: 'Only 0 available in stock.' })
      expect(audit.calls).toHaveLength(0)
    })

    it('rolls back and returns error when post-insert re-check detects over-allocation', async () => {
      // Set quantity=1, then pre-seed a concurrent assignment that consumes it
      // The pre-check passes (1 available) but after our insert total = 2 > 1
      repo.assets.set(ASSET_ID, { ...repo.assets.get(ASSET_ID)!, quantity: 1 })

      // We'll simulate the race by hooking into insertAssignment to add a
      // concurrent assignment right before the post-check runs
      const originalInsert = repo.insertAssignment.bind(repo)
      repo.insertAssignment = async (data) => {
        const result = await originalInsert(data)
        // Concurrent checkout sneaks in right after our insert
        await originalInsert({
          assetId: ASSET_ID,
          assignedToUserId: null,
          assignedToName: 'Concurrent',
          assignedById: 'u2',
          assignedByName: 'Admin',
          quantity: 1,
          departmentId: null,
          locationId: null,
          expectedReturnAt: null,
          notes: null,
        })
        return result
      }

      const ports = makePorts(repo, audit)
      const result = await checkoutAsset(
        ASSET_ID,
        makeInput({ quantity: 1 }),
        'Admin',
        ACTOR_ID,
        ports
      )

      expect(result).toEqual({ error: 'This item just went out of stock. Please try again.' })
      expect(audit.calls).toHaveLength(0)
      // Only the concurrent assignment remains; ours was rolled back
      const active = [...repo.assignments.values()].filter((a) => !a.returnedAt)
      expect(active).toHaveLength(1)
      expect(active[0]!.assignedToName).toBe('Concurrent')
    })
  })
})

// ---------------------------------------------------------------------------
// returnSerializedAsset
// ---------------------------------------------------------------------------

describe('returnSerializedAsset', () => {
  let repo: InMemoryCheckoutRepo
  let audit: SpyAuditPort

  beforeEach(async () => {
    repo = new InMemoryCheckoutRepo()
    audit = new SpyAuditPort()
    repo.seedAsset({
      id: ASSET_ID,
      name: 'Laptop',
      isBulk: false,
      quantity: null,
      departmentId: null,
    })
    await repo.insertAssignment({
      assetId: ASSET_ID,
      assignedToUserId: null,
      assignedToName: 'Alice',
      assignedById: ACTOR_ID,
      assignedByName: 'Admin',
      quantity: 1,
      departmentId: null,
      locationId: null,
      expectedReturnAt: null,
      notes: null,
    })
  })

  it('closes the open assignment and logs audit', async () => {
    const ports = makePorts(repo, audit)
    const result = await returnSerializedAsset(ASSET_ID, ports)

    expect(result).toBeNull()
    const open = [...repo.assignments.values()].filter((a) => !a.returnedAt)
    expect(open).toHaveLength(0)
    expect(audit.calls[0]).toMatchObject({
      action: 'returned',
      entityId: ASSET_ID,
      changes: { assignedTo: { old: 'Alice', new: null } },
    })
  })
})

// ---------------------------------------------------------------------------
// returnBulkAssignment
// ---------------------------------------------------------------------------

describe('returnBulkAssignment', () => {
  let repo: InMemoryCheckoutRepo
  let audit: SpyAuditPort
  let assignmentId: string

  beforeEach(async () => {
    repo = new InMemoryCheckoutRepo()
    audit = new SpyAuditPort()
    repo.seedAsset({
      id: ASSET_ID,
      name: 'Walkie Talkie',
      isBulk: true,
      quantity: 10,
      departmentId: null,
    })
    const { id } = await repo.insertAssignment({
      assetId: ASSET_ID,
      assignedToUserId: null,
      assignedToName: 'Bob',
      assignedById: ACTOR_ID,
      assignedByName: 'Admin',
      quantity: 5,
      departmentId: null,
      locationId: null,
      expectedReturnAt: null,
      notes: null,
    })
    assignmentId = id
  })

  it('returns error when assignment not found', async () => {
    const result = await returnBulkAssignment('nonexistent', 1, makePorts(repo, audit))
    expect(result).toEqual({ error: 'Assignment not found.' })
  })

  it('reduces quantity on partial return', async () => {
    const result = await returnBulkAssignment(assignmentId, 2, makePorts(repo, audit))

    expect(result).toBeNull()
    expect(repo.assignments.get(assignmentId)!.quantity).toBe(3)
    expect(repo.assignments.get(assignmentId)!.returnedAt).toBeNull()
    expect(audit.calls[0]).toMatchObject({
      action: 'returned',
      changes: { quantity: { old: 5, new: 3 } },
    })
  })

  it('closes the assignment on full return', async () => {
    const result = await returnBulkAssignment(assignmentId, 5, makePorts(repo, audit))

    expect(result).toBeNull()
    expect(repo.assignments.get(assignmentId)!.returnedAt).not.toBeNull()
    expect(audit.calls[0]!.changes).toMatchObject({ quantity: { old: 5, new: 0 } })
  })

  it('closes the assignment when returning more than held', async () => {
    const result = await returnBulkAssignment(assignmentId, 99, makePorts(repo, audit))

    expect(result).toBeNull()
    expect(repo.assignments.get(assignmentId)!.returnedAt).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// updateAssignment
// ---------------------------------------------------------------------------

describe('updateAssignment', () => {
  let repo: InMemoryCheckoutRepo
  let audit: SpyAuditPort
  let assignmentId: string

  beforeEach(async () => {
    repo = new InMemoryCheckoutRepo()
    audit = new SpyAuditPort()
    repo.seedAsset({
      id: ASSET_ID,
      name: 'Walkie Talkie',
      isBulk: true,
      quantity: 10,
      departmentId: null,
    })
    // 4 units checked out on another assignment
    await repo.insertAssignment({
      assetId: ASSET_ID,
      assignedToUserId: null,
      assignedToName: 'Other',
      assignedById: 'u0',
      assignedByName: 'Admin',
      quantity: 4,
      departmentId: null,
      locationId: null,
      expectedReturnAt: null,
      notes: null,
    })
    const { id } = await repo.insertAssignment({
      assetId: ASSET_ID,
      assignedToUserId: null,
      assignedToName: 'Bob',
      assignedById: ACTOR_ID,
      assignedByName: 'Admin',
      quantity: 3,
      departmentId: null,
      locationId: null,
      expectedReturnAt: null,
      notes: null,
    })
    assignmentId = id
  })

  it('updates the assignment name and logs audit', async () => {
    const ports = makePorts(repo, audit)
    const result = await updateAssignment(
      assignmentId,
      ASSET_ID,
      true,
      makeInput({ assignedToName: 'Robert', quantity: 3 }),
      ports
    )

    expect(result).toBeNull()
    expect(repo.assignments.get(assignmentId)!.assignedToName).toBe('Robert')
    expect(audit.calls[0]).toMatchObject({ action: 'updated', entityId: ASSET_ID })
  })

  it('persists all patch fields — quantity, departmentId, locationId, notes', async () => {
    const ports = makePorts(repo, audit)
    await updateAssignment(
      assignmentId,
      ASSET_ID,
      true,
      makeInput({
        assignedToName: 'Bob',
        quantity: 2,
        departmentId: 'dept-001',
        locationId: 'loc-001',
        notes: 'fragile',
      }),
      ports
    )

    const stored = repo.assignments.get(assignmentId)!
    expect(stored.quantity).toBe(2)
    expect(stored.departmentId).toBe('dept-001')
    expect(stored.locationId).toBe('loc-001')
    expect(stored.notes).toBe('fragile')
  })

  it('allows quantity up to available + own allocation (bulk)', async () => {
    // 10 total, 4 by others, this assignment has 3 → max = 10 - 4 = 6
    const ports = makePorts(repo, audit)
    const result = await updateAssignment(
      assignmentId,
      ASSET_ID,
      true,
      makeInput({ quantity: 6 }),
      ports
    )
    expect(result).toBeNull()
  })

  it('rejects quantity that exceeds available pool (bulk)', async () => {
    // 10 total, 4 by others → max = 6, requesting 7
    const ports = makePorts(repo, audit)
    const result = await updateAssignment(
      assignmentId,
      ASSET_ID,
      true,
      makeInput({ quantity: 7 }),
      ports
    )
    expect(result).toEqual({ error: 'Only 6 available.' })
    expect(audit.calls).toHaveLength(0)
  })

  it('skips availability check for serialized assets', async () => {
    repo.seedAsset({
      id: 'serial-01',
      name: 'Laptop',
      isBulk: false,
      quantity: null,
      departmentId: null,
    })
    const { id } = await repo.insertAssignment({
      assetId: 'serial-01',
      assignedToUserId: null,
      assignedToName: 'Dave',
      assignedById: ACTOR_ID,
      assignedByName: 'Admin',
      quantity: 1,
      departmentId: null,
      locationId: null,
      expectedReturnAt: null,
      notes: null,
    })
    const ports = makePorts(repo, audit)
    const result = await updateAssignment(id, 'serial-01', false, makeInput({ quantity: 1 }), ports)
    expect(result).toBeNull()
  })
})
