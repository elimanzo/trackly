'use server'

import { VendorFormSchema, type VendorFormInput } from '@/lib/types'

import { logAudit } from './_audit'
import { getAdminCtx } from './_context'

export async function createVendor(
  input: VendorFormInput
): Promise<{ id: string } | { error: string }> {
  const parsed = VendorFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getAdminCtx()
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
      contact_email: input.contactEmail || null,
      contact_phone: input.contactPhone || null,
      website: input.website || null,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'vendor',
    entityId: data.id as string,
    entityName: input.name,
    action: 'created',
  })

  return { id: data.id as string }
}

export async function updateVendor(
  id: string,
  input: VendorFormInput
): Promise<{ error: string } | null> {
  const parsed = VendorFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getAdminCtx()
  if ('error' in ctx) return ctx

  const { error } = await ctx.admin
    .from('vendors')
    .update({
      name: input.name,
      contact_email: input.contactEmail || null,
      contact_phone: input.contactPhone || null,
      website: input.website || null,
      notes: input.notes || null,
    })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'vendor',
    entityId: id,
    entityName: input.name,
    action: 'updated',
  })

  return null
}

export async function deleteVendor(id: string): Promise<{ error: string } | null> {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return ctx

  const { data: vendor } = await ctx.admin.from('vendors').select('name').eq('id', id).maybeSingle()

  const { error } = await ctx.admin
    .from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'vendor',
    entityId: id,
    entityName: (vendor?.name as string) ?? 'Unknown',
    action: 'deleted',
  })

  return null
}
