import { z } from 'zod'

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export const DashboardConfigSchema = z.object({
  showCharts: z.boolean().optional(),
  showWarranty: z.boolean().optional(),
  showActivity: z.boolean().optional(),
})

export type DashboardConfig = z.infer<typeof DashboardConfigSchema>

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  ownerId: z.string().uuid(),
  logoUrl: z.string().url().nullable(),
  onboardingCompleted: z.boolean(),
  departmentLabel: z.string().min(1).max(50),
  dashboardConfig: DashboardConfigSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Organization = z.infer<typeof OrganizationSchema>

// ---------------------------------------------------------------------------
// Create / update forms
// ---------------------------------------------------------------------------

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
})

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>

export const UpdateOrganizationSchema = CreateOrganizationSchema.extend({
  departmentLabel: z.string().min(1, 'Label is required').max(50),
  dashboardConfig: DashboardConfigSchema,
}).partial()

export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>
