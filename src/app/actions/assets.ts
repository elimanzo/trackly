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
  type AssetId,
  type AssignmentId,
  type CheckoutFormInput,
  type TypedAsset,
  type UserId,
} from '@/lib/types'
import { nextTagInSequence, sanitizePrefix } from '@/lib/utils/assetTag'

import { logAudit } from './_audit'
import type { ActionClients } from './_context'
import { getContext } from './_context'
import { mapDbError } from './_db'

function normalizeAssetInput(input: AssetFormInput) {
  return {
    ...input,
    status: input.isBulk ? ('active' as const) : input.status,
    quantity: input.isBulk ? input.quantity : null,
    notes: input.notes?.trim() || null,
  }
}

export async function createAsset(
  orgSlug: string,
  input: AssetFormInput,
  clients?: ActionClients
): Promise<{ error: string } | { id: string }> {
  const parsed = AssetFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getContext(orgSlug, clients)
  if (!ctx) return { error: 'Not authenticated' }

  const denied = createPolicy(ctx).enforce('asset:create', { departmentId: input.departmentId })
  if (denied) return denied

  const normalized = normalizeAssetInput(input)

  const { data, error } = await ctx.admin
    .from('assets')
    .insert({
      org_id: ctx.orgId,
      asset_tag: normalized.assetTag,
      name: normalized.name,
      is_bulk: normalized.isBulk,
      quantity: normalized.quantity,
      category_id: normalized.categoryId,
      department_id: normalized.departmentId,
      location_id: normalized.locationId,
      status: normalized.status,
      purchase_date: normalized.purchaseDate,
      purchase_cost: normalized.purchaseCost,
      warranty_expiry: normalized.warrantyExpiry,
      vendor_id: normalized.vendorId,
      notes: normalized.notes,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('id')
    .single()

  if (error)
    return {
      error: mapDbError(error, { UNIQUE_VIOLATION: 'Asset tag already exists. Use a unique tag.' }),
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
  orgSlug: string,
  id: string,
  input: AssetFormInput,
  clients?: ActionClients
): Promise<{ error: string } | null> {
  const parsed = AssetFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getContext(orgSlug, clients)
  if (!ctx) return { error: 'Not authenticated' }

  // Fetch old values for change tracking and permission check
  const { data: old } = await ctx.admin
    .from('assets')
    .select('name, status, category_id, department_id, location_id, vendor_id, quantity')
    .eq('id', id)
    .maybeSingle()

  if (!old) return { error: 'Asset not found' }

  // Enforce permission on the source department
  const deniedSource = createPolicy(ctx).enforce('asset:update', {
    departmentId: (old.department_id as string | null) ?? null,
  })
  if (deniedSource) return deniedSource

  // If moving departments, also enforce permission on the destination
  if (input.departmentId !== (old.department_id as string | null)) {
    const deniedDest = createPolicy(ctx).enforce('asset:update', {
      departmentId: input.departmentId,
    })
    if (deniedDest) return deniedDest
  }

  const normalized = normalizeAssetInput(input)

  const { error } = await ctx.admin
    .from('assets')
    .update({
      asset_tag: normalized.assetTag,
      name: normalized.name,
      is_bulk: normalized.isBulk,
      quantity: normalized.quantity,
      category_id: normalized.categoryId,
      department_id: normalized.departmentId,
      location_id: normalized.locationId,
      status: normalized.status,
      purchase_date: normalized.purchaseDate,
      purchase_cost: normalized.purchaseCost,
      warranty_expiry: normalized.warrantyExpiry,
      vendor_id: normalized.vendorId,
      notes: normalized.notes,
      updated_by: ctx.userId,
    })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  if (error)
    return {
      error: mapDbError(error, { UNIQUE_VIOLATION: 'Asset tag already exists. Use a unique tag.' }),
    }

  const changes: Record<string, { old: unknown; new: unknown }> = {}
  if (old.name !== normalized.name) changes.name = { old: old.name, new: normalized.name }
  if (!normalized.isBulk && old.status !== normalized.status)
    changes.status = { old: old.status, new: normalized.status }
  if (normalized.isBulk && old.quantity !== normalized.quantity)
    changes.quantity = { old: old.quantity, new: normalized.quantity }
  if (old.department_id !== normalized.departmentId)
    changes.department_id = { old: old.department_id, new: normalized.departmentId }
  if (old.location_id !== normalized.locationId)
    changes.location_id = { old: old.location_id, new: normalized.locationId }
  if (old.category_id !== normalized.categoryId)
    changes.category_id = { old: old.category_id, new: normalized.categoryId }
  if (old.vendor_id !== normalized.vendorId)
    changes.vendor_id = { old: old.vendor_id, new: normalized.vendorId }

  await logAudit(ctx, {
    entityType: 'asset',
    entityId: id,
    entityName: normalized.name,
    action: 'updated',
    changes: Object.keys(changes).length > 0 ? changes : null,
  })

  return null
}

export async function deleteAsset(
  orgSlug: string,
  id: string,
  clients?: ActionClients
): Promise<{ error: string } | null> {
  const ctx = await getContext(orgSlug, clients)
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
  orgSlug: string,
  assetRef: Pick<TypedAsset, 'id' | 'isBulk'>,
  input: CheckoutFormInput,
  assignedByName: string,
  clients?: ActionClients
): Promise<{ error: string } | null> {
  const parsed = CheckoutFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getContext(orgSlug, clients)
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
    assetRef.id as AssetId,
    parsed.data,
    assignedByName,
    ctx.userId as UserId,
    createSupabaseCheckoutPorts(ctx)
  )
}

/** Return a serialized (non-bulk) asset entirely */
export async function returnAsset(
  orgSlug: string,
  assetId: string
): Promise<{ error: string } | null> {
  const ctx = await getContext(orgSlug)
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

  return returnSerializedAsset(assetId as AssetId, createSupabaseCheckoutPorts(ctx))
}

/** Partially or fully return a bulk assignment */
export async function returnBulkAssignment(
  orgSlug: string,
  assignmentId: string,
  quantityToReturn: number
): Promise<{ error: string } | null> {
  const ctx = await getContext(orgSlug)
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
    assignmentId as AssignmentId,
    quantityToReturn,
    createSupabaseCheckoutPorts(ctx)
  )
}

/** Increase total stock quantity for a bulk asset */
export async function restockAsset(
  orgSlug: string,
  assetId: string,
  additionalQuantity: number
): Promise<{ error: string } | null> {
  const ctx = await getContext(orgSlug)
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
  orgSlug: string,
  assignmentId: string,
  assetRef: Pick<TypedAsset, 'id' | 'isBulk'>,
  input: CheckoutFormInput
): Promise<{ error: string } | null> {
  const parsed = CheckoutFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const ctx = await getContext(orgSlug)
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
    assignmentId as AssignmentId,
    assetRef.id as AssetId,
    assetRef.isBulk,
    parsed.data,
    createSupabaseCheckoutPorts(ctx)
  )
}

/** Return distinct tag prefixes used in the org (everything before the last '-') */
export async function getTagPrefixes(orgSlug: string): Promise<string[]> {
  const ctx = await getContext(orgSlug)
  if (!ctx) return []

  const { data } = await ctx.admin.rpc('get_tag_prefixes', { p_org_id: ctx.orgId })
  return (data as string[] | null) ?? []
}

/** Return the next tag for a given prefix (e.g. "LAPTOP" → "LAPTOP-0001") */
export async function getNextTagForPrefix(orgSlug: string, prefix: string): Promise<string> {
  const sanitized = sanitizePrefix(prefix)
  if (!sanitized) return `${prefix}-0001`

  const ctx = await getContext(orgSlug)
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
