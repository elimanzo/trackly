'use server'

import {
  logRetroactiveMaintenance,
  scheduleMaintenance,
  createSupabaseMaintenancePorts,
} from '@/lib/maintenance'
import { createPolicy } from '@/lib/permissions'
import { MaintenanceFormSchema, type MaintenanceFormInput } from '@/lib/types/maintenance'

import { getContext } from './_context'

export async function scheduleMaintenanceAction(
  orgSlug: string,
  assetId: string,
  assetDepartmentId: string | null,
  input: MaintenanceFormInput
): Promise<{ error: string } | null> {
  const parsed = MaintenanceFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getContext(orgSlug)
  if (!ctx) return { error: 'Not authenticated' }

  const denied = createPolicy(ctx).enforce('maintenance:manage', {
    departmentId: assetDepartmentId,
  })
  if (denied) return denied

  const { data: assetRow } = await ctx.admin
    .from('assets')
    .select('is_bulk')
    .eq('id', assetId)
    .eq('org_id', ctx.orgId)
    .single()
  if (assetRow?.is_bulk) {
    return {
      error:
        'Maintenance cannot be scheduled for bulk assets. Track individual units as serialized assets.',
    }
  }

  const ports = createSupabaseMaintenancePorts(ctx)

  if (parsed.data.isRetroactive) {
    return logRetroactiveMaintenance(
      ctx.orgId,
      assetId,
      {
        title: parsed.data.title,
        type: parsed.data.type,
        scheduledDate: parsed.data.scheduledDate,
        startedAt: parsed.data.startedAt!,
        completedAt: parsed.data.completedAt!,
        cost: parsed.data.cost,
        technicianName: parsed.data.technicianName ?? null,
        notes: parsed.data.notes ?? null,
      },
      ctx.userId,
      ports
    )
  }

  return scheduleMaintenance(
    ctx.orgId,
    assetId,
    {
      title: parsed.data.title,
      type: parsed.data.type,
      scheduledDate: parsed.data.scheduledDate,
      technicianName: parsed.data.technicianName ?? null,
      notes: parsed.data.notes ?? null,
    },
    ctx.userId,
    ports
  )
}
