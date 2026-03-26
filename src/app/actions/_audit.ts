import type { ActionContext } from './_context'

type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'checked_out'
  | 'returned'
  | 'status_changed'
  | 'invited'
  | 'role_changed'

type EntityType = 'asset' | 'user' | 'department' | 'category' | 'location' | 'vendor'

type AuditEntry = {
  orgId: string
  actorId: string
  actorName: string
  entityType: EntityType
  entityId: string
  entityName: string
  action: AuditAction
  changes?: Record<string, { old: unknown; new: unknown }> | null
}

/** Fire-and-forget — never throws or blocks the caller */
export async function logAudit(
  ctx: ActionContext,
  entry: Omit<AuditEntry, 'orgId' | 'actorId' | 'actorName'>
) {
  try {
    await ctx.admin.from('audit_logs').insert({
      org_id: ctx.orgId,
      actor_id: ctx.userId,
      actor_name: ctx.actorName,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      entity_name: entry.entityName,
      action: entry.action,
      changes: entry.changes ?? null,
    })
  } catch {
    // Audit failures must never break the primary operation
  }
}
