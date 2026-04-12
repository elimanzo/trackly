import { z } from 'zod'

import { AssetStatusSchema } from './asset'

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export const StatusBreakdownSchema = z.object({
  status: AssetStatusSchema,
  count: z.number().int().min(0),
})

export type StatusBreakdown = z.infer<typeof StatusBreakdownSchema>

export const DepartmentBreakdownSchema = z.object({
  departmentId: z.string().uuid(),
  departmentName: z.string(),
  count: z.number().int().min(0),
  value: z.number().nonnegative(),
})

export type DepartmentBreakdown = z.infer<typeof DepartmentBreakdownSchema>

export const WarrantyAlertSchema = z.object({
  assetId: z.string().uuid(),
  assetTag: z.string(),
  assetName: z.string(),
  departmentName: z.string().nullable(),
  warrantyExpiry: z.string(), // ISO date YYYY-MM-DD
  daysRemaining: z.number().int(),
})

export type WarrantyAlert = z.infer<typeof WarrantyAlertSchema>

export const UpcomingMaintenanceAlertSchema = z.object({
  eventId: z.string().uuid(),
  assetId: z.string().uuid(),
  assetTag: z.string(),
  assetName: z.string(),
  departmentName: z.string().nullable(),
  title: z.string(),
  scheduledDate: z.string(), // ISO date YYYY-MM-DD
  daysUntil: z.number().int(),
})

export type UpcomingMaintenanceAlert = z.infer<typeof UpcomingMaintenanceAlertSchema>

export const DashboardStatsSchema = z.object({
  totalAssets: z.number().int().min(0),
  totalValue: z.number().nonnegative(),
  byStatus: z.array(StatusBreakdownSchema),
  byDepartment: z.array(DepartmentBreakdownSchema),
  warrantyAlerts: z.array(WarrantyAlertSchema),
  upcomingMaintenance: z.array(UpcomingMaintenanceAlertSchema),
  recentActivityCount: z.number().int().min(0),
})

export type DashboardStats = z.infer<typeof DashboardStatsSchema>
