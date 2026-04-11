import { logAudit } from '@/app/actions/_audit'
import type { ActionContext } from '@/app/actions/_context'
import type { AssetStatus } from '@/lib/types'
import type { MaintenanceStatus } from '@/lib/types/maintenance'

import type {
  CompleteMaintenanceData,
  InsertMaintenanceData,
  MaintenanceAuditPayload,
  MaintenanceAuditPort,
  MaintenancePorts,
  MaintenanceRepository,
  UpdateMaintenanceData,
} from './ports'

type AdminClient = ActionContext['admin']

function makeRepo(admin: AdminClient, orgId: string): MaintenanceRepository {
  return {
    async getAsset(assetId) {
      const { data } = await admin
        .from('assets')
        .select('id, name, status')
        .eq('id', assetId)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .single()
      if (!data) return null
      return {
        id: data.id as string,
        name: data.name as string,
        status: data.status as AssetStatus,
      }
    },

    async getEvent(eventId) {
      const { data } = await admin
        .from('maintenance_events')
        .select('id, asset_id, status, title, created_by')
        .eq('id', eventId)
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .single()
      if (!data) return null
      return {
        id: data.id as string,
        assetId: data.asset_id as string,
        status: data.status as MaintenanceStatus,
        title: data.title as string,
        createdBy: data.created_by as string | null,
      }
    },

    async getActiveEvent(assetId) {
      const { data } = await admin
        .from('maintenance_events')
        .select('id, asset_id, status, title, created_by')
        .eq('asset_id', assetId)
        .eq('org_id', orgId)
        .in('status', ['scheduled', 'in_progress'])
        .is('deleted_at', null)
        .maybeSingle()
      if (!data) return null
      return {
        id: data.id as string,
        assetId: data.asset_id as string,
        status: data.status as MaintenanceStatus,
        title: data.title as string,
        createdBy: data.created_by as string | null,
      }
    },

    async insertEvent(row: InsertMaintenanceData) {
      const { data, error } = await admin
        .from('maintenance_events')
        .insert({
          org_id: row.orgId,
          asset_id: row.assetId,
          title: row.title,
          type: row.type,
          status: row.status,
          scheduled_date: row.scheduledDate,
          started_at: row.startedAt,
          completed_at: row.completedAt,
          cost: row.cost,
          technician_name: row.technicianName,
          notes: row.notes,
          created_by: row.createdBy,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return { id: (data as { id: string }).id }
    },

    async setEventStatus(eventId, status: MaintenanceStatus) {
      await admin
        .from('maintenance_events')
        .update({ status })
        .eq('id', eventId)
        .eq('org_id', orgId)
    },

    async completeEvent(eventId, data: CompleteMaintenanceData) {
      await admin
        .from('maintenance_events')
        .update({
          status: 'completed',
          completed_at: data.completedAt,
          cost: data.cost,
          technician_name: data.technicianName,
          notes: data.notes,
        })
        .eq('id', eventId)
        .eq('org_id', orgId)
    },

    async updateEvent(eventId, data: UpdateMaintenanceData) {
      await admin
        .from('maintenance_events')
        .update({
          title: data.title,
          type: data.type,
          scheduled_date: data.scheduledDate,
          cost: data.cost,
          technician_name: data.technicianName,
          notes: data.notes,
        })
        .eq('id', eventId)
        .eq('org_id', orgId)
    },

    async softDeleteEvent(eventId) {
      await admin
        .from('maintenance_events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', eventId)
        .eq('org_id', orgId)
    },

    async setAssetStatus(assetId, status: AssetStatus) {
      await admin.from('assets').update({ status }).eq('id', assetId).eq('org_id', orgId)
    },
  }
}

function makeAudit(ctx: ActionContext): MaintenanceAuditPort {
  return {
    async log(payload: MaintenanceAuditPayload) {
      await logAudit(ctx, payload)
    },
  }
}

/** Build MaintenancePorts from a live ActionContext. One call per server action invocation. */
export function createSupabaseMaintenancePorts(ctx: ActionContext): MaintenancePorts {
  return {
    repo: makeRepo(ctx.admin, ctx.orgId),
    audit: makeAudit(ctx),
  }
}
