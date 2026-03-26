import { z } from 'zod'

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export const AuditActionSchema = z.enum([
  'created',
  'updated',
  'deleted',
  'checked_out',
  'returned',
  'status_changed',
  'invited',
  'role_changed',
])

export type AuditAction = z.infer<typeof AuditActionSchema>

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  actorId: z.string().uuid(),
  actorName: z.string(),
  entityType: z.enum(['asset', 'user', 'department', 'category', 'location', 'vendor']),
  entityId: z.string().uuid(),
  entityName: z.string(),
  action: AuditActionSchema,
  changes: z.record(z.string(), z.object({ old: z.unknown(), new: z.unknown() })).nullable(),
  createdAt: z.string().datetime(),
})

export type AuditLog = z.infer<typeof AuditLogSchema>
