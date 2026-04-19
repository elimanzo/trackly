'use server'

import { softDeleteWithCascade } from '@/lib/soft-delete'
import { CategoryFormSchema, type CategoryFormInput } from '@/lib/types'

import { logAudit } from './_audit'
import type { ActionClients } from './_context'
import { getAdminCtx, getContext } from './_context'
import { mapDbError } from './_db'

export async function createCategory(
  orgSlug: string,
  input: CategoryFormInput
): Promise<{ id: string } | { error: string }> {
  const parsed = CategoryFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getAdminCtx(orgSlug)
  if ('error' in ctx) return ctx

  const { data: existing } = await ctx.admin
    .from('categories')
    .select('id')
    .eq('org_id', ctx.orgId)
    .ilike('name', input.name.trim())
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) return { error: 'A category with that name already exists.' }

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

  if (error) return { error: mapDbError(error) }

  await logAudit(ctx, {
    entityType: 'category',
    entityId: data.id as string,
    entityName: input.name,
    action: 'created',
  })

  return { id: data.id as string }
}

export async function updateCategory(
  orgSlug: string,
  id: string,
  input: CategoryFormInput
): Promise<{ error: string } | null> {
  const parsed = CategoryFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getAdminCtx(orgSlug)
  if ('error' in ctx) return ctx

  const { error } = await ctx.admin
    .from('categories')
    .update({ name: input.name, description: input.description ?? null, icon: input.icon ?? null })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: mapDbError(error) }

  await logAudit(ctx, {
    entityType: 'category',
    entityId: id,
    entityName: input.name,
    action: 'updated',
  })

  return null
}

export async function countAssetsInCategory(orgSlug: string, id: string): Promise<number> {
  const ctx = await getContext(orgSlug)
  if (!ctx) return 0

  const { count } = await ctx.admin
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', ctx.orgId)
    .eq('category_id', id)
    .is('deleted_at', null)

  return count ?? 0
}

export async function deleteCategory(
  orgSlug: string,
  id: string,
  clients?: ActionClients
): Promise<{ error: string } | null> {
  const ctx = await getContext(orgSlug, clients)
  if (!ctx) return { error: 'Not authenticated' }
  const permission = ctx.requireRole('admin')
  if (permission) return permission

  return softDeleteWithCascade(ctx, {
    entityTable: 'categories',
    entityType: 'category',
    entityId: id,
    assetFkColumn: 'category_id',
  })
}
