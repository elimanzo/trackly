import type {
  AssignmentPatch,
  AuditPayload,
  AuditPort,
  CheckoutAssignmentRecord,
  CheckoutAssetRecord,
  CheckoutRepository,
  InsertAssignmentData,
} from '../ports'

// ---------------------------------------------------------------------------
// InMemoryCheckoutRepo
// ---------------------------------------------------------------------------

export class InMemoryCheckoutRepo implements CheckoutRepository {
  assets = new Map<string, CheckoutAssetRecord>()
  assignments = new Map<string, CheckoutAssignmentRecord & { asset: CheckoutAssetRecord }>()
  private nextId = 1

  seedAsset(asset: CheckoutAssetRecord & { id: string }) {
    this.assets.set(asset.id, {
      name: asset.name,
      isBulk: asset.isBulk,
      quantity: asset.quantity,
      departmentId: asset.departmentId,
    })
  }

  async getAsset(assetId: string) {
    return this.assets.get(assetId) ?? null
  }

  async getAssignmentWithAsset(assignmentId: string) {
    const stored = this.assignments.get(assignmentId)
    if (!stored) return null
    // Spread so callers see a snapshot; mutations via other methods don't affect this copy
    return { ...stored }
  }

  async getActiveAssignment(assetId: string) {
    for (const a of this.assignments.values()) {
      if (a.assetId === assetId && !a.returnedAt) return a
    }
    return null
  }

  async sumCheckedOut(assetId: string, excludeAssignmentId?: string) {
    let sum = 0
    for (const [id, a] of this.assignments) {
      if (a.assetId === assetId && !a.returnedAt && id !== excludeAssignmentId) {
        sum += a.quantity
      }
    }
    return sum
  }

  async insertAssignment(data: InsertAssignmentData) {
    const id = `asgn-${this.nextId++}`
    const asset = this.assets.get(data.assetId)
    if (!asset) throw new Error(`Asset ${data.assetId} not found`)
    this.assignments.set(id, {
      id,
      assetId: data.assetId,
      quantity: data.quantity,
      assignedToName: data.assignedToName,
      returnedAt: null,
      asset,
    })
    return { id }
  }

  async deleteAssignment(assignmentId: string) {
    this.assignments.delete(assignmentId)
  }

  async closeOpenAssignment(assetId: string) {
    for (const a of this.assignments.values()) {
      if (a.assetId === assetId && !a.returnedAt) {
        a.returnedAt = new Date().toISOString()
        break
      }
    }
  }

  async closeAssignmentById(assignmentId: string) {
    const a = this.assignments.get(assignmentId)
    if (a) a.returnedAt = new Date().toISOString()
  }

  async updateAssignmentQuantity(assignmentId: string, quantity: number) {
    const a = this.assignments.get(assignmentId)
    if (a) a.quantity = quantity
  }

  async updateAssignmentFields(assignmentId: string, patch: AssignmentPatch) {
    const a = this.assignments.get(assignmentId)
    if (a) a.assignedToName = patch.assignedToName
  }

  async setAssetStatus(_assetId: string, _status: 'active' | 'checked_out') {
    // status is not tracked in this fake — tests assert via assignments map
  }
}

// ---------------------------------------------------------------------------
// SpyAuditPort
// ---------------------------------------------------------------------------

export class SpyAuditPort implements AuditPort {
  calls: AuditPayload[] = []
  async log(payload: AuditPayload) {
    this.calls.push(payload)
  }
}

// ---------------------------------------------------------------------------
// Permission stubs (used in action-layer tests, not domain tests)
// ---------------------------------------------------------------------------

export const noopAudit: AuditPort = { log: async () => {} }
