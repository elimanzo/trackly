'use server'

import type { CategoryFormInput } from '@/lib/types'

import { logAudit } from './_audit'
import { getContext } from './_context'

export async function createCategory(input: CategoryFormInput): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { data, error } = await ctx.admin
    .from('categories')
    .insert({
      org_id: ctx.orgId,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'category',
    entityId: data.id as string,
    entityName: input.name,
    action: 'created',
  })

  return null
}

export async function updateCategory(
  id: string,
  input: CategoryFormInput
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.admin
    .from('categories')
    .update({ name: input.name, description: input.description ?? null, icon: input.icon ?? null })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'category',
    entityId: id,
    entityName: input.name,
    action: 'updated',
  })

  return null
}

export async function deleteCategory(id: string): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: cat } = await ctx.admin.from('categories').select('name').eq('id', id).maybeSingle()

  const { error } = await ctx.admin
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'category',
    entityId: id,
    entityName: (cat?.name as string) ?? 'Unknown',
    action: 'deleted',
  })

  return null
}
