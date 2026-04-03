'use server'

import { softDeleteWithCascade } from '@/lib/soft-delete'
import { DepartmentFormSchema, type DepartmentFormInput } from '@/lib/types'

import { logAudit } from './_audit'
import type { ActionClients } from './_context'
import { getAdminCtx, getContext } from './_context'

export async function createDepartment(
  input: DepartmentFormInput
): Promise<{ id: string } | { error: string }> {
  const parsed = DepartmentFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getAdminCtx()
  if ('error' in ctx) return ctx

  const { data: existing } = await ctx.admin
    .from('departments')
    .select('id')
    .eq('org_id', ctx.orgId)
    .ilike('name', input.name.trim())
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) return { error: 'A department with that name already exists.' }

  const { data, error } = await ctx.admin
    .from('departments')
    .insert({ org_id: ctx.orgId, name: input.name, description: input.description ?? null })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'department',
    entityId: data.id as string,
    entityName: input.name,
    action: 'created',
  })

  return { id: data.id as string }
}

export async function updateDepartment(
  id: string,
  input: DepartmentFormInput
): Promise<{ error: string } | null> {
  const parsed = DepartmentFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getAdminCtx()
  if ('error' in ctx) return ctx

  const { error } = await ctx.admin
    .from('departments')
    .update({ name: input.name, description: input.description ?? null })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'department',
    entityId: id,
    entityName: input.name,
    action: 'updated',
  })

  return null
}

export async function countAssetsInDepartment(id: string): Promise<number> {
  const ctx = await getContext()
  if (!ctx) return 0

  const { count } = await ctx.admin
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', ctx.orgId)
    .eq('department_id', id)
    .is('deleted_at', null)

  return count ?? 0
}

export async function deleteDepartment(
  id: string,
  clients?: ActionClients
): Promise<{ error: string } | null> {
  const ctx = await getContext(clients)
  if (!ctx) return { error: 'Not authenticated' }
  const permission = ctx.requireRole('admin')
  if (permission) return permission

  return softDeleteWithCascade(ctx, {
    entityTable: 'departments',
    entityType: 'department',
    entityId: id,
    assetFkColumn: 'department_id',
  })
}
