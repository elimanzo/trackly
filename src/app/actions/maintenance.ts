'use server'

import {
  completeMaintenance,
  createSupabaseMaintenancePorts,
  deleteMaintenance,
  logRetroactiveMaintenance,
  scheduleMaintenance,
  startMaintenance,
  updateMaintenance,
} from '@/lib/maintenance'
import { createPolicy } from '@/lib/permissions'
import type { AssetId, EventId, OrgId, UserId } from '@/lib/types'
import {
  CompleteMaintenanceFormSchema,
  MaintenanceFormSchema,
  UpdateMaintenanceFormSchema,
  type CompleteMaintenanceFormInput,
  type MaintenanceFormInput,
  type UpdateMaintenanceFormInput,
} from '@/lib/types/maintenance'

import { getContext } from './_context'

export async function scheduleMaintenanceAction(
  orgSlug: string,
  assetId: string,
  assetDepartmentId: string | null,
  input: MaintenanceFormInput
): Promise<{ error: string } | null> {
  const parsed = MaintenanceFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

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
      ctx.orgId as OrgId,
      assetId as AssetId,
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
      ctx.userId as UserId,
      ports
    )
  }

  return scheduleMaintenance(
    ctx.orgId as OrgId,
    assetId as AssetId,
    {
      title: parsed.data.title,
      type: parsed.data.type,
      scheduledDate: parsed.data.scheduledDate,
      technicianName: parsed.data.technicianName ?? null,
      notes: parsed.data.notes ?? null,
    },
    ctx.userId as UserId,
    ports
  )
}

export async function startMaintenanceAction(
  orgSlug: string,
  eventId: string,
  assetDepartmentId: string | null
): Promise<{ error: string } | null> {
  const ctx = await getContext(orgSlug)
  if (!ctx) return { error: 'Not authenticated' }

  const denied = createPolicy(ctx).enforce('maintenance:manage', {
    departmentId: assetDepartmentId,
  })
  if (denied) return denied

  return startMaintenance(eventId as EventId, createSupabaseMaintenancePorts(ctx))
}

export async function completeMaintenanceAction(
  orgSlug: string,
  eventId: string,
  assetDepartmentId: string | null,
  input: CompleteMaintenanceFormInput
): Promise<{ error: string } | null> {
  const parsed = CompleteMaintenanceFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getContext(orgSlug)
  if (!ctx) return { error: 'Not authenticated' }

  const denied = createPolicy(ctx).enforce('maintenance:manage', {
    departmentId: assetDepartmentId,
  })
  if (denied) return denied

  return completeMaintenance(eventId as EventId, parsed.data, createSupabaseMaintenancePorts(ctx))
}

export async function updateMaintenanceAction(
  orgSlug: string,
  eventId: string,
  assetDepartmentId: string | null,
  input: UpdateMaintenanceFormInput
): Promise<{ error: string } | null> {
  const parsed = UpdateMaintenanceFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getContext(orgSlug)
  if (!ctx) return { error: 'Not authenticated' }

  // Only admins and owners can edit maintenance events
  const denied = createPolicy(ctx).enforce('department:manage')
  if (denied) return denied

  return updateMaintenance(
    eventId as EventId,
    {
      title: parsed.data.title,
      type: parsed.data.type,
      scheduledDate: parsed.data.scheduledDate,
      cost: parsed.data.cost,
      technicianName: parsed.data.technicianName ?? null,
      notes: parsed.data.notes ?? null,
    },
    createSupabaseMaintenancePorts(ctx)
  )
}

export async function deleteMaintenanceAction(
  orgSlug: string,
  eventId: string,
  assetDepartmentId: string | null
): Promise<{ error: string } | null> {
  const ctx = await getContext(orgSlug)
  if (!ctx) return { error: 'Not authenticated' }

  const policy = createPolicy(ctx)
  const denied = policy.enforce('maintenance:delete', { departmentId: assetDepartmentId })
  if (denied) return denied

  const isAdmin = policy.can('department:manage')

  return deleteMaintenance(
    eventId as EventId,
    ctx.userId as UserId,
    isAdmin,
    createSupabaseMaintenancePorts(ctx)
  )
}
