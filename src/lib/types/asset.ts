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
}

// ---------------------------------------------------------------------------
// Asset
// ---------------------------------------------------------------------------

export const AssetSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  assetTag: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid().nullable(),
  departmentId: z.string().uuid().nullable(),
  locationId: z.string().uuid().nullable(),
  status: AssetStatusSchema,
  purchaseDate: z.string().nullable(), // ISO date string YYYY-MM-DD
  purchaseCost: z.number().nonnegative().nullable(),
  warrantyExpiry: z.string().nullable(), // ISO date string YYYY-MM-DD
  vendorId: z.string().uuid().nullable(),
  notes: z.string().max(2000).nullable(),
  imageUrl: z.string().url().nullable(),
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
})

export type AssetAssignment = z.infer<typeof AssetAssignmentSchema>

// ---------------------------------------------------------------------------
// Asset with resolved relations (for display in tables and detail views)
// ---------------------------------------------------------------------------

export type AssetWithRelations = Asset & {
  categoryName: string | null
  departmentName: string | null
  locationName: string | null
  vendorName: string | null
  currentAssignment: AssetAssignment | null
}

// ---------------------------------------------------------------------------
// Create / update forms
// ---------------------------------------------------------------------------

export const AssetFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  assetTag: z.string().min(1, 'Asset tag is required').max(50),
  categoryId: z.string().min(1).nullable(),
  departmentId: z.string().uuid().nullable(),
  locationId: z.string().min(1).nullable(),
  status: AssetStatusSchema,
  purchaseDate: z.string().nullable(),
  purchaseCost: z.number({ error: 'Must be a number' }).nonnegative('Must be 0 or more').nullable(),
  warrantyExpiry: z.string().nullable(),
  vendorId: z.string().min(1).nullable(),
  notes: z.string().max(2000).optional(),
  imageUrl: z.string().url().nullable().optional(),
})

export type AssetFormInput = z.infer<typeof AssetFormSchema>

// ---------------------------------------------------------------------------
// Checkout form
// ---------------------------------------------------------------------------

export const CheckoutFormSchema = z.object({
  assignedToUserId: z.string().uuid().nullable(),
  assignedToName: z.string().min(1, 'Assignee name is required').max(200),
  expectedReturnAt: z.string().nullable(),
  notes: z.string().max(1000).optional(),
})

export type CheckoutFormInput = z.infer<typeof CheckoutFormSchema>
