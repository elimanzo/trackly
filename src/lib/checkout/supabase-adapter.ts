import { logAudit } from '@/app/actions/_audit'
import type { ActionContext } from '@/app/actions/_context'

import type {
  AssignmentPatch,
  AuditPayload,
  AuditPort,
  CheckoutAssignmentRecord,
  CheckoutAssetRecord,
  CheckoutPorts,
  CheckoutRepository,
  InsertAssignmentData,
} from './ports'

type AdminClient = ActionContext['admin']

function makeRepo(admin: AdminClient, orgId: string, actorId: string): CheckoutRepository {
  return {
    async getAsset(assetId) {
      const { data } = await admin
        .from('assets')
        .select('name, is_bulk, quantity, department_id')
        .eq('id', assetId)
        .single()
      if (!data) return null
      return {
        name: data.name as string,
        isBulk: data.is_bulk as boolean,
        quantity: data.quantity as number | null,
        departmentId: data.department_id as string | null,
      }
    },

    async getAssignmentWithAsset(assignmentId) {
      const { data } = await admin
        .from('asset_assignments')
        .select(
          'id, asset_id, quantity, assigned_to_name, returned_at, assets(name, is_bulk, quantity, department_id)'
        )
        .eq('id', assignmentId)
        .single()
      if (!data) return null

      // Supabase join returns object or single-element array depending on cardinality
      const raw = Array.isArray(data.assets) ? data.assets[0] : data.assets
      if (!raw) return null

      const asset: CheckoutAssetRecord = {
        name: (
          raw as {
            name: string
            is_bulk: boolean
            quantity: number | null
            department_id: string | null
          }
        ).name,
        isBulk: (
          raw as {
            name: string
            is_bulk: boolean
            quantity: number | null
            department_id: string | null
          }
        ).is_bulk,
        quantity: (
          raw as {
            name: string
            is_bulk: boolean
            quantity: number | null
            department_id: string | null
          }
        ).quantity,
        departmentId: (
          raw as {
            name: string
            is_bulk: boolean
            quantity: number | null
            department_id: string | null
          }
        ).department_id,
      }

      const record: CheckoutAssignmentRecord = {
        id: data.id as string,
        assetId: data.asset_id as string,
        quantity: data.quantity as number,
        assignedToName: data.assigned_to_name as string,
        returnedAt: data.returned_at as string | null,
      }

      return { ...record, asset }
    },

    async getActiveAssignment(assetId) {
      const { data } = await admin
        .from('asset_assignments')
        .select('id, asset_id, quantity, assigned_to_name, returned_at')
        .eq('asset_id', assetId)
        .is('returned_at', null)
        .maybeSingle()
      if (!data) return null
      return {
        id: data.id as string,
        assetId: data.asset_id as string,
        quantity: data.quantity as number,
        assignedToName: data.assigned_to_name as string,
        returnedAt: data.returned_at as string | null,
      }
    },

    async sumCheckedOut(assetId, excludeAssignmentId) {
      const { data } = await admin
        .from('asset_assignments')
        .select('id, quantity')
        .eq('asset_id', assetId)
        .is('returned_at', null)
      return ((data ?? []) as { id: string; quantity: number }[])
        .filter((r) => !excludeAssignmentId || r.id !== excludeAssignmentId)
        .reduce((sum, r) => sum + (r.quantity ?? 1), 0)
    },

    async insertAssignment(row: InsertAssignmentData) {
      const { data, error } = await admin
        .from('asset_assignments')
        .insert({
          asset_id: row.assetId,
          assigned_to_user_id: row.assignedToUserId,
          assigned_to_name: row.assignedToName,
          assigned_by: row.assignedById,
          assigned_by_name: row.assignedByName,
          quantity: row.quantity,
          department_id: row.departmentId,
          location_id: row.locationId,
          expected_return_at: row.expectedReturnAt,
          notes: row.notes,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return { id: (data as { id: string }).id }
    },

    async deleteAssignment(assignmentId) {
      await admin.from('asset_assignments').delete().eq('id', assignmentId)
    },

    async closeOpenAssignment(assetId) {
      await admin
        .from('asset_assignments')
        .update({ returned_at: new Date().toISOString() })
        .eq('asset_id', assetId)
        .is('returned_at', null)
    },

    async closeAssignmentById(assignmentId) {
      await admin
        .from('asset_assignments')
        .update({ returned_at: new Date().toISOString() })
        .eq('id', assignmentId)
    },

    async updateAssignmentQuantity(assignmentId, quantity) {
      await admin.from('asset_assignments').update({ quantity }).eq('id', assignmentId)
    },

    async updateAssignmentFields(assignmentId, patch: AssignmentPatch) {
      await admin
        .from('asset_assignments')
        .update({
          assigned_to_name: patch.assignedToName,
          quantity: patch.quantity,
          department_id: patch.departmentId,
          location_id: patch.locationId,
          expected_return_at: patch.expectedReturnAt,
          notes: patch.notes,
        })
        .eq('id', assignmentId)
    },

    async setAssetStatus(assetId, status) {
      await admin
        .from('assets')
        .update({ status, updated_by: actorId })
        .eq('id', assetId)
        .eq('org_id', orgId)
    },
  }
}

function makeAudit(ctx: ActionContext): AuditPort {
  return {
    async log(payload: AuditPayload) {
      await logAudit(ctx, payload)
    },
  }
}

/** Build CheckoutPorts from a live ActionContext. One call per server action invocation. */
export function createSupabaseCheckoutPorts(ctx: ActionContext): CheckoutPorts {
  return {
    repo: makeRepo(ctx.admin, ctx.orgId, ctx.userId),
    audit: makeAudit(ctx),
  }
}
