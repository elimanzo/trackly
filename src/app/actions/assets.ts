'use server'

import { revalidatePath } from 'next/cache'

import {
  checkoutAsset as checkoutAssetDomain,
  createSupabaseCheckoutPorts,
  returnBulkAssignment as returnBulkAssignmentDomain,
  returnSerializedAsset,
  updateAssignment as updateAssignmentDomain,
} from '@/lib/checkout'
import { createPolicy } from '@/lib/permissions'
import {
  AssetFormSchema,
  CheckoutFormSchema,
  type AssetFormInput,
  type CheckoutFormInput,
  type TypedAsset,
} from '@/lib/types'
import { nextTagInSequence, sanitizePrefix } from '@/lib/utils/assetTag'

import { logAudit } from './_audit'
import type { ActionClients } from './_context'
import { getContext } from './_context'

export async function createAsset(
  input: AssetFormInput,
  clients?: ActionClients
): Promise<{ error: string } | { id: string }> {
  const parsed = AssetFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getContext(clients)
  if (!ctx) return { error: 'Not authenticated' }

  const denied = createPolicy(ctx).enforce('asset:create', { departmentId: input.departmentId })
  if (denied) return denied

  const { data, error } = await ctx.admin
    .from('assets')
    .insert({
      org_id: ctx.orgId,
      asset_tag: input.assetTag,
      name: input.name,
      is_bulk: input.isBulk,
      quantity: input.isBulk ? input.quantity : null,
      category_id: input.categoryId,
      department_id: input.departmentId,
      location_id: input.locationId,
      status: input.isBulk ? 'active' : input.status,
      purchase_date: input.purchaseDate,
      purchase_cost: input.purchaseCost,
      warranty_expiry: input.warrantyExpiry,
      vendor_id: input.vendorId,
      notes: input.notes || null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'Asset tag already exists. Use a unique tag.' }
    return { error: error.message }
  }

  await logAudit(ctx, {
    entityType: 'asset',
    entityId: data.id as string,
    entityName: input.name,
    action: 'created',
  })

  return { id: data.id as string }
}

export async function updateAsset(
  id: string,
  input: AssetFormInput,
  clients?: ActionClients
): Promise<{ error: string } | null> {
  const parsed = AssetFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getContext(clients)
  if (!ctx) return { error: 'Not authenticated' }

  // Fetch old values for change tracking and permission check
  const { data: old } = await ctx.admin
    .from('assets')
    .select('name, status, category_id, department_id, location_id, quantity')
    .eq('id', id)
    .maybeSingle()

  const denied = createPolicy(ctx).enforce('asset:update', {
    departmentId: (old?.department_id as string | null) ?? null,
  })
  if (denied) return denied

  const { error } = await ctx.admin
    .from('assets')
    .update({
      asset_tag: input.assetTag,
      name: input.name,
      is_bulk: input.isBulk,
      quantity: input.isBulk ? input.quantity : null,
      category_id: input.categoryId,
      department_id: input.departmentId,
      location_id: input.locationId,
      status: input.isBulk ? 'active' : input.status,
      purchase_date: input.purchaseDate,
      purchase_cost: input.purchaseCost,
      warranty_expiry: input.warrantyExpiry,
      vendor_id: input.vendorId,
      notes: input.notes || null,
      updated_by: ctx.userId,
    })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) {
    if (error.code === '23505') return { error: 'Asset tag already exists. Use a unique tag.' }
    return { error: error.message }
  }

  if (old) {
    const changes: Record<string, { old: unknown; new: unknown }> = {}
    if (old.name !== input.name) changes.name = { old: old.name, new: input.name }
    if (!input.isBulk && old.status !== input.status)
      changes.status = { old: old.status, new: input.status }
    if (input.isBulk && old.quantity !== input.quantity)
      changes.quantity = { old: old.quantity, new: input.quantity }

    await logAudit(ctx, {
      entityType: 'asset',
      entityId: id,
      entityName: input.name,
      action: 'updated',
      changes: Object.keys(changes).length > 0 ? changes : null,
    })
  }

  return null
}

export async function deleteAsset(
  id: string,
  clients?: ActionClients
): Promise<{ error: string } | null> {
  const ctx = await getContext(clients)
  if (!ctx) return { error: 'Not authenticated' }

  const { data: asset } = await ctx.admin
    .from('assets')
    .select('name, department_id')
    .eq('id', id)
    .maybeSingle()

  const denied = createPolicy(ctx).enforce('asset:delete', {
    departmentId: (asset?.department_id as string | null) ?? null,
  })
  if (denied) return denied

  const { error } = await ctx.admin
    .from('assets')
    .update({ deleted_at: new Date().toISOString(), updated_by: ctx.userId })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'asset',
    entityId: id,
    entityName: (asset?.name as string) ?? 'Unknown asset',
    action: 'deleted',
  })

  revalidatePath('/assets')
  return null
}

export async function checkoutAsset(
  assetRef: Pick<TypedAsset, 'id' | 'isBulk'>,
  input: CheckoutFormInput,
  assignedByName: string,
  clients?: ActionClients
): Promise<{ error: string } | null> {
  const parsed = CheckoutFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getContext(clients)
  if (!ctx) return { error: 'Not authenticated' }

  const { data: asset } = await ctx.admin
    .from('assets')
    .select('department_id')
    .eq('id', assetRef.id)
    .single()

  const denied = createPolicy(ctx).enforce('asset:checkout', {
    departmentId: (asset?.department_id as string | null) ?? null,
  })
  if (denied) return denied

  return checkoutAssetDomain(
    assetRef.id,
    parsed.data,
    assignedByName,
    ctx.userId,
    createSupabaseCheckoutPorts(ctx)
  )
}

/** Return a serialized (non-bulk) asset entirely */
export async function returnAsset(assetId: string): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: asset } = await ctx.admin
    .from('assets')
    .select('department_id')
    .eq('id', assetId)
    .maybeSingle()

  const denied = createPolicy(ctx).enforce('asset:return', {
    departmentId: (asset?.department_id as string | null) ?? null,
  })
  if (denied) return denied

  return returnSerializedAsset(assetId, createSupabaseCheckoutPorts(ctx))
}

/** Partially or fully return a bulk assignment */
export async function returnBulkAssignment(
  assignmentId: string,
  quantityToReturn: number
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  // Fetch asset_id → department_id for permission check
  const { data: asgn } = await ctx.admin
    .from('asset_assignments')
    .select('asset_id')
    .eq('id', assignmentId)
    .single()

  const { data: asset } = asgn
    ? await ctx.admin
        .from('assets')
        .select('department_id')
        .eq('id', asgn.asset_id as string)
        .single()
    : { data: null }

  const denied = createPolicy(ctx).enforce('asset:return', {
    departmentId: (asset?.department_id as string | null) ?? null,
  })
  if (denied) return denied

  return returnBulkAssignmentDomain(
    assignmentId,
    quantityToReturn,
    createSupabaseCheckoutPorts(ctx)
  )
}

/** Increase total stock quantity for a bulk asset */
export async function restockAsset(
  assetId: string,
  additionalQuantity: number
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: asset } = await ctx.admin
    .from('assets')
    .select('name, quantity, department_id')
    .eq('id', assetId)
    .single()

  const denied = createPolicy(ctx).enforce('asset:restock', {
    departmentId: (asset?.department_id as string | null) ?? null,
  })
  if (denied) return denied

  const oldQuantity = (asset?.quantity ?? 0) as number
  const newQuantity = oldQuantity + additionalQuantity

  const { error } = await ctx.admin
    .from('assets')
    .update({ quantity: newQuantity, updated_by: ctx.userId })
    .eq('id', assetId)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'asset',
    entityId: assetId,
    entityName: (asset?.name as string) ?? 'Unknown asset',
    action: 'updated',
    changes: { quantity: { old: oldQuantity, new: newQuantity } },
  })

  return null
}

/** Edit an existing checkout assignment */
export async function updateAssignment(
  assignmentId: string,
  assetRef: Pick<TypedAsset, 'id' | 'isBulk'>,
  input: CheckoutFormInput
): Promise<{ error: string } | null> {
  const parsed = CheckoutFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: asset } = await ctx.admin
    .from('assets')
    .select('department_id')
    .eq('id', assetRef.id)
    .maybeSingle()

  const denied = createPolicy(ctx).enforce('assignment:update', {
    departmentId: (asset?.department_id as string | null) ?? null,
  })
  if (denied) return denied

  return updateAssignmentDomain(
    assignmentId,
    assetRef.id,
    assetRef.isBulk,
    parsed.data,
    createSupabaseCheckoutPorts(ctx)
  )
}

/** Return distinct tag prefixes used in the org (everything before the last '-') */
export async function getTagPrefixes(): Promise<string[]> {
  const ctx = await getContext()
  if (!ctx) return []

  const { data } = await ctx.admin
    .from('assets')
    .select('asset_tag')
    .eq('org_id', ctx.orgId)
    .is('deleted_at', null)

  if (!data) return []

  const prefixes = new Set<string>()
  for (const { asset_tag } of data as { asset_tag: string }[]) {
    const idx = asset_tag.lastIndexOf('-')
    if (idx > 0) prefixes.add(asset_tag.slice(0, idx))
  }

  return Array.from(prefixes).sort()
}

/** Return the next tag for a given prefix (e.g. "LAPTOP" → "LAPTOP-0001") */
export async function getNextTagForPrefix(prefix: string): Promise<string> {
  const sanitized = sanitizePrefix(prefix)
  if (!sanitized) return `${prefix}-0001`

  const ctx = await getContext()
  if (!ctx) return `${sanitized}-0001`

  const { data } = await ctx.admin
    .from('assets')
    .select('asset_tag')
    .eq('org_id', ctx.orgId)
    .is('deleted_at', null)
    .ilike('asset_tag', `${sanitized}-%`)

  return nextTagInSequence(
    sanitized,
    (data ?? []).map((r) => (r as { asset_tag: string }).asset_tag)
  )
}
