'use server'

import type { LocationFormInput } from '@/lib/types'

import { logAudit } from './_audit'
import { getContext } from './_context'

export async function createLocation(input: LocationFormInput): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

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

  return null
}

export async function updateLocation(
  id: string,
  input: LocationFormInput
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

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

export async function deleteLocation(id: string): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: loc } = await ctx.admin.from('locations').select('name').eq('id', id).maybeSingle()

  const { error } = await ctx.admin
    .from('locations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'location',
    entityId: id,
    entityName: (loc?.name as string) ?? 'Unknown',
    action: 'deleted',
  })

  return null
}
