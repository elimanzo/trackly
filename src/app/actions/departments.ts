'use server'

import type { DepartmentFormInput } from '@/lib/types'

import { logAudit } from './_audit'
import { getContext } from './_context'

export async function createDepartment(
  input: DepartmentFormInput
): Promise<{ id: string } | { error: string }> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

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
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

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

export async function deleteDepartment(id: string): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: dept } = await ctx.admin
    .from('departments')
    .select('name')
    .eq('id', id)
    .maybeSingle()

  const { error } = await ctx.admin
    .from('departments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'department',
    entityId: id,
    entityName: (dept?.name as string) ?? 'Unknown',
    action: 'deleted',
  })

  return null
}
