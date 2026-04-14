'use server'

import { softDeleteWithCascade } from '@/lib/soft-delete'
import { VendorFormSchema, type VendorFormInput } from '@/lib/types'

import { logAudit } from './_audit'
import { getAdminCtx } from './_context'
import { mapDbError } from './_db'

export async function createVendor(
  orgSlug: string,
  input: VendorFormInput
): Promise<{ id: string } | { error: string }> {
  const parsed = VendorFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getAdminCtx(orgSlug)
  if ('error' in ctx) return ctx

  const { data: existing } = await ctx.admin
    .from('vendors')
    .select('id')
    .eq('org_id', ctx.orgId)
    .ilike('name', input.name.trim())
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) return { error: 'A vendor with that name already exists.' }

  const { data, error } = await ctx.admin
    .from('vendors')
    .insert({
      org_id: ctx.orgId,
      name: input.name,
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      website: input.website?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return { error: mapDbError(error) }

  await logAudit(ctx, {
    entityType: 'vendor',
    entityId: data.id as string,
    entityName: input.name,
    action: 'created',
  })

  return { id: data.id as string }
}

export async function updateVendor(
  orgSlug: string,
  id: string,
  input: VendorFormInput
): Promise<{ error: string } | null> {
  const parsed = VendorFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getAdminCtx(orgSlug)
  if ('error' in ctx) return ctx

  const { error } = await ctx.admin
    .from('vendors')
    .update({
      name: input.name,
      contact_email: input.contactEmail?.trim() || null,
      contact_phone: input.contactPhone?.trim() || null,
      website: input.website?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: mapDbError(error) }

  await logAudit(ctx, {
    entityType: 'vendor',
    entityId: id,
    entityName: input.name,
    action: 'updated',
  })

  return null
}

export async function deleteVendor(orgSlug: string, id: string): Promise<{ error: string } | null> {
  const ctx = await getAdminCtx(orgSlug)
  if ('error' in ctx) return ctx

  return softDeleteWithCascade(ctx, {
    entityTable: 'vendors',
    entityType: 'vendor',
    entityId: id,
    assetFkColumn: 'vendor_id',
  })
}
