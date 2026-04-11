import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const MaintenanceTypeSchema = z.enum(['preventive', 'corrective', 'inspection'])
export type MaintenanceType = z.infer<typeof MaintenanceTypeSchema>

export const MAINTENANCE_TYPES = MaintenanceTypeSchema.options

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventive',
  corrective: 'Corrective',
  inspection: 'Inspection',
}

export const MaintenanceStatusSchema = z.enum(['scheduled', 'in_progress', 'completed'])
export type MaintenanceStatus = z.infer<typeof MaintenanceStatusSchema>

export const MAINTENANCE_STATUSES = MaintenanceStatusSchema.options

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
}

// ---------------------------------------------------------------------------
// MaintenanceEvent (record shape returned from DB)
// ---------------------------------------------------------------------------

export const MaintenanceEventSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  assetId: z.string().uuid(),
  title: z.string(),
  type: MaintenanceTypeSchema,
  status: MaintenanceStatusSchema,
  scheduledDate: z.string(), // ISO date string YYYY-MM-DD
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  cost: z.number().nonnegative().nullable(),
  technicianName: z.string().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string().uuid().nullable(),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type MaintenanceEvent = z.infer<typeof MaintenanceEventSchema>
