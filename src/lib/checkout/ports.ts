// ---------------------------------------------------------------------------
// Shared record types — camelCase, no Supabase noise
// ---------------------------------------------------------------------------

export type CheckoutAssetRecord = {
  name: string
  isBulk: boolean
  quantity: number | null // null for serialized
  departmentId: string | null
}

export type CheckoutAssignmentRecord = {
  id: string
  assetId: string
  quantity: number
  assignedToName: string
  returnedAt: string | null
}

export type AuditPayload = {
  entityType: 'asset'
  entityId: string
  entityName: string
  action: 'checked_out' | 'returned' | 'updated'
  changes: Record<string, { old: unknown; new: unknown }> | null
}

export type InsertAssignmentData = {
  assetId: string
  assignedToUserId: string | null
  assignedToName: string
  assignedById: string
  assignedByName: string
  quantity: number
  departmentId: string | null
  locationId: string | null
  expectedReturnAt: string | null
  notes: string | null
}

export type AssignmentPatch = {
  assignedToName: string
  quantity: number
  departmentId: string | null
  locationId: string | null
  expectedReturnAt: string | null
  notes: string | null
}

// ---------------------------------------------------------------------------
// Ports
// ---------------------------------------------------------------------------

export interface CheckoutRepository {
  getAsset(assetId: string): Promise<CheckoutAssetRecord | null>

  /** Fetch an assignment joined with its asset. Used by bulk return and updateAssignment. */
  getAssignmentWithAsset(
    assignmentId: string
  ): Promise<(CheckoutAssignmentRecord & { asset: CheckoutAssetRecord }) | null>

  /** Fetch the open (not-yet-returned) assignment for a serialized asset. */
  getActiveAssignment(assetId: string): Promise<CheckoutAssignmentRecord | null>

  /** Sum of active (non-returned) assignment quantities. Excludes one assignment when given. */
  sumCheckedOut(assetId: string, excludeAssignmentId?: string): Promise<number>

  insertAssignment(data: InsertAssignmentData): Promise<{ id: string }>
  deleteAssignment(assignmentId: string): Promise<void>

  /** Mark the open assignment for a serialized asset as returned (filters by asset_id). */
  closeOpenAssignment(assetId: string): Promise<void>

  /** Close a specific bulk assignment by its id. */
  closeAssignmentById(assignmentId: string): Promise<void>

  updateAssignmentQuantity(assignmentId: string, quantity: number): Promise<void>
  updateAssignmentFields(assignmentId: string, patch: AssignmentPatch): Promise<void>

  setAssetStatus(assetId: string, status: 'active' | 'checked_out'): Promise<void>
}

export interface AuditPort {
  /** Fire-and-forget — implementors must never throw. */
  log(payload: AuditPayload): Promise<void>
}

export type CheckoutPorts = {
  repo: CheckoutRepository
  audit: AuditPort
}
