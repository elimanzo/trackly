import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const AssetStatusSchema = z.enum([
  'active',
  'under_maintenance',
  'retired',
  'lost',
  'in_storage',
  'checked_out',
  'reserved',
])

export type AssetStatus = z.infer<typeof AssetStatusSchema>

export const ASSET_STATUSES = AssetStatusSchema.options

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: 'Active',
  under_maintenance: 'Under Maintenance',
  retired: 'Retired',
  lost: 'Lost',
  in_storage: 'In Storage',
  checked_out: 'Checked Out',
  reserved: 'Reserved',
}

// ---------------------------------------------------------------------------
// Asset
// ---------------------------------------------------------------------------

export const AssetSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  assetTag: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  isBulk: z.boolean(),
  quantity: z.number().int().nonnegative().nullable(),
  categoryId: z.string().uuid().nullable(),
  departmentId: z.string().uuid().nullable(),
  locationId: z.string().uuid().nullable(),
  status: AssetStatusSchema,
  purchaseDate: z.string().nullable(), // ISO date string YYYY-MM-DD
  purchaseCost: z.number().nonnegative().nullable(),
  warrantyExpiry: z.string().nullable(), // ISO date string YYYY-MM-DD
  vendorId: z.string().uuid().nullable(),
  notes: z.string().max(2000).nullable(),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid(),
})

export type Asset = z.infer<typeof AssetSchema>

// ---------------------------------------------------------------------------
// Asset assignment (checkout / check-in)
// ---------------------------------------------------------------------------

export const AssetAssignmentSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  assignedToUserId: z.string().uuid().nullable(),
  assignedToName: z.string().min(1).max(200),
  assignedBy: z.string().uuid(),
  assignedByName: z.string(),
  assignedAt: z.string().datetime(),
  expectedReturnAt: z.string().datetime().nullable(),
  returnedAt: z.string().datetime().nullable(),
  notes: z.string().max(1000).nullable(),
  quantity: z.number().int().min(1),
  departmentId: z.string().uuid().nullable(),
  departmentName: z.string().nullable(),
  locationId: z.string().uuid().nullable(),
  locationName: z.string().nullable(),
})

export type AssetAssignment = z.infer<typeof AssetAssignmentSchema>

// ---------------------------------------------------------------------------
// Asset with resolved relations (for display in tables and detail views)
// ---------------------------------------------------------------------------

type AssetRelations = {
  readonly categoryName: string | null
  readonly departmentName: string | null
  readonly locationName: string | null
  readonly vendorName: string | null
}

/** Pre-computed view-layer fields — eliminates isBulk branching in UI components. */
export type AssetUI = {
  /** null = render <AssetStatusBadge>; string = render <Badge variant="secondary"> */
  readonly statusBadgeText: string | null
  /** "items" for bulk, "asset" for serialized — used in CheckoutModal title */
  readonly checkoutLabel: 'items' | 'asset'
  /** "— 4 available" for bulk, "— TAG-001" for serialized */
  readonly checkoutSubtitle: string
  /** null = don't render quantity field; number = max for the quantity input */
  readonly availableQty: number | null
  /** "Checked out (3)" for bulk, "Assignment" for serialized */
  readonly assignmentTabLabel: string
  /** Which secondary action button to show in the detail header */
  readonly secondaryAction: 'restock' | 'return' | null
  /** Normalized assignment list — serialized gets [] or [currentAssignment] */
  readonly assignments: readonly AssetAssignment[]
}

/** Pre-computed display fields available on every asset regardless of kind. */
type AssetDisplay = {
  /** "Alice" for serialized, "Alice +2 others" for bulk with multiple, null if unassigned. */
  readonly assigneeSummary: string | null
  /** "3/10 avail." for bulk; ASSET_STATUS_LABELS value for serialized. */
  readonly statusLabel: string
  /** True if the asset can be checked out right now — uniform gate, no branching needed. */
  readonly isAvailable: boolean
  readonly isCheckedOut: boolean
  readonly ui: AssetUI
}

export type BulkAsset = Asset &
  AssetRelations &
  AssetDisplay & {
    isBulk: true
    quantity: number // non-nullable: bulk assets always have a stock count
    available: number // pre-computed units available for checkout
    quantityCheckedOut: number
    activeAssignments: AssetAssignment[]
  }

export type SerializedAsset = Asset &
  AssetRelations &
  AssetDisplay & {
    isBulk: false
    quantity: null
    currentAssignment: AssetAssignment | null
  }

export type TypedAsset = BulkAsset | SerializedAsset

/** @deprecated Use TypedAsset */
export type AssetWithRelations = TypedAsset

// ---------------------------------------------------------------------------
// Create / update forms
// ---------------------------------------------------------------------------

export const AssetFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  assetTag: z.string().min(1, 'Asset tag is required').max(50),
  isBulk: z.boolean(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').nullable(),
  categoryId: z.string().min(1).nullable(),
  departmentId: z.string().uuid().nullable(),
  locationId: z.string().min(1).nullable(),
  status: AssetStatusSchema,
  purchaseDate: z.string().nullable(),
  purchaseCost: z.number({ error: 'Must be a number' }).nonnegative('Must be 0 or more').nullable(),
  warrantyExpiry: z.string().nullable(),
  vendorId: z.string().min(1).nullable(),
  notes: z.string().max(2000).optional(),
})

export type AssetFormInput = z.infer<typeof AssetFormSchema>

// ---------------------------------------------------------------------------
// Checkout form
// ---------------------------------------------------------------------------

export const CheckoutFormSchema = z.object({
  assignedToUserId: z.string().uuid().nullish(),
  assignedToName: z.string().min(1, 'Assignee name is required').max(200),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  departmentId: z.string().uuid().nullish(),
  locationId: z.string().uuid().nullish(),
  expectedReturnAt: z.string().nullable(),
  notes: z.string().max(1000).optional(),
})

export type CheckoutFormInput = z.infer<typeof CheckoutFormSchema>
