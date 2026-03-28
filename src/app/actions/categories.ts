'use server'

import { CategoryFormSchema, type CategoryFormInput } from '@/lib/types'

import { logAudit } from './_audit'
import { getAdminCtx, getContext } from './_context'

export async function createCategory(
  input: CategoryFormInput
): Promise<{ id: string } | { error: string }> {
  const parsed = CategoryFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getAdminCtx()
  if ('error' in ctx) return ctx

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

  return { id: data.id as string }
}

export async function updateCategory(
  id: string,
  input: CategoryFormInput
): Promise<{ error: string } | null> {
  const parsed = CategoryFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getAdminCtx()
  if ('error' in ctx) return ctx

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

export async function countAssetsInCategory(id: string): Promise<number> {
  const ctx = await getContext()
  if (!ctx) return 0

  const { count } = await ctx.admin
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', ctx.orgId)
    .eq('category_id', id)
    .is('deleted_at', null)

  return count ?? 0
}

export async function deleteCategory(id: string): Promise<{ error: string } | null> {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return ctx

  const { data: cat } = await ctx.admin.from('categories').select('name').eq('id', id).maybeSingle()

  const { error } = await ctx.admin
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  // Null out category_id on assets — mirrors what ON DELETE SET NULL would do for a hard delete
  await ctx.admin
    .from('assets')
    .update({ category_id: null })
    .eq('org_id', ctx.orgId)
    .eq('category_id', id)

  await logAudit(ctx, {
    entityType: 'category',
    entityId: id,
    entityName: (cat?.name as string) ?? 'Unknown',
    action: 'deleted',
  })

  return null
}
