'use server'

import { softDeleteWithCascade } from '@/lib/soft-delete'
import { LocationFormSchema, type LocationFormInput } from '@/lib/types'

import { logAudit } from './_audit'
import { getAdminCtx } from './_context'

export async function createLocation(
  orgSlug: string,
  input: LocationFormInput
): Promise<{ id: string } | { error: string }> {
  const parsed = LocationFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getAdminCtx(orgSlug)
  if ('error' in ctx) return ctx

  const { data: existing } = await ctx.admin
    .from('locations')
    .select('id')
    .eq('org_id', ctx.orgId)
    .ilike('name', input.name.trim())
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) return { error: 'A location with that name already exists.' }

  const { data, error } = await ctx.admin
    .from('locations')
    .insert({ org_id: ctx.orgId, name: input.name, description: input.description ?? null })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'location',
    entityId: data.id as string,
    entityName: input.name,
    action: 'created',
  })

  return { id: data.id as string }
}

export async function updateLocation(
  orgSlug: string,
  id: string,
  input: LocationFormInput
): Promise<{ error: string } | null> {
  const parsed = LocationFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getAdminCtx(orgSlug)
  if ('error' in ctx) return ctx

  const { error } = await ctx.admin
    .from('locations')
    .update({ name: input.name, description: input.description ?? null })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'location',
    entityId: id,
    entityName: input.name,
    action: 'updated',
  })

  return null
}

export async function deleteLocation(
  orgSlug: string,
  id: string
): Promise<{ error: string } | null> {
  const ctx = await getAdminCtx(orgSlug)
  if ('error' in ctx) return ctx

  return softDeleteWithCascade(ctx, {
    entityTable: 'locations',
    entityType: 'location',
    entityId: id,
    assetFkColumn: 'location_id',
  })
}
