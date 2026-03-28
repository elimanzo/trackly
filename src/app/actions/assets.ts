'use server'

import { revalidatePath } from 'next/cache'

import {
  AssetFormSchema,
  CheckoutFormSchema,
  type AssetFormInput,
  type CheckoutFormInput,
} from '@/lib/types'
import { computeAvailable } from '@/lib/utils/availability'

import { logAudit } from './_audit'
import type { ActionClients, ActionContext } from './_context'
import { getContext, requireCanEdit } from './_context'

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Sum of active checked-out quantities for an asset, optionally excluding one assignment. */
async function fetchCheckedOut(
  admin: ActionContext['admin'],
  assetId: string,
  excludeAssignmentId?: string
): Promise<number> {
  const { data: rows } = await admin
    .from('asset_assignments')
    .select('id, quantity')
    .eq('asset_id', assetId)
    .is('returned_at', null)
  return ((rows ?? []) as { id: string; quantity: number }[])
    .filter((r) => !excludeAssignmentId || r.id !== excludeAssignmentId)
    .reduce((sum, r) => sum + (r.quantity ?? 1), 0)
}

export async function createAsset(
  input: AssetFormInput,
  clients?: ActionClients
): Promise<{ error: string } | { id: string }> {
  const parsed = AssetFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getContext(clients)
  if (!ctx) return { error: 'Not authenticated' }

  const denied = requireCanEdit(ctx, input.departmentId ?? null)
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

  const denied = requireCanEdit(ctx, (old?.department_id as string | null) ?? null)
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

  const denied = requireCanEdit(ctx, (asset?.department_id as string | null) ?? null)
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
  assetId: string,
  input: CheckoutFormInput,
  assignedByName: string,
  isBulk: boolean
): Promise<{ error: string } | null> {
  const parsed = CheckoutFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: asset } = await ctx.admin
    .from('assets')
    .select('name, quantity, department_id')
    .eq('id', assetId)
    .single()

  const denied = requireCanEdit(ctx, (asset?.department_id as string | null) ?? null)
  if (denied) return denied

  if (isBulk) {
    const checkedOut = await fetchCheckedOut(ctx.admin, assetId)
    const available = computeAvailable(asset?.quantity ?? 0, checkedOut)
    if (input.quantity > available) {
      return { error: `Only ${available} available in stock.` }
    }
  }

  const { error: assignError } = await ctx.admin.from('asset_assignments').insert({
    asset_id: assetId,
    assigned_to_user_id: input.assignedToUserId,
    assigned_to_name: input.assignedToName,
    assigned_by: ctx.userId,
    assigned_by_name: assignedByName,
    quantity: input.quantity,
    department_id: input.departmentId || null,
    location_id: input.locationId || null,
    expected_return_at: input.expectedReturnAt
      ? new Date(input.expectedReturnAt).toISOString()
      : null,
    notes: input.notes || null,
  })

  if (assignError) return { error: assignError.message }

  // Bulk assets stay 'active'; only serialized assets become 'checked_out'
  if (!isBulk) {
    const { error } = await ctx.admin
      .from('assets')
      .update({ status: 'checked_out', updated_by: ctx.userId })
      .eq('id', assetId)
      .eq('org_id', ctx.orgId)
    if (error) return { error: error.message }
  }

  await logAudit(ctx, {
    entityType: 'asset',
    entityId: assetId,
    entityName: (asset?.name as string) ?? 'Unknown asset',
    action: 'checked_out',
    changes: {
      assignedTo: { old: null, new: input.assignedToName },
      ...(isBulk ? { quantity: { old: null, new: input.quantity } } : {}),
    },
  })

  return null
}

/** Return a serialized (non-bulk) asset entirely */
export async function returnAsset(assetId: string): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: assignment } = await ctx.admin
    .from('asset_assignments')
    .select('assigned_to_name')
    .eq('asset_id', assetId)
    .is('returned_at', null)
    .maybeSingle()

  const { data: asset } = await ctx.admin
    .from('assets')
    .select('name, department_id')
    .eq('id', assetId)
    .maybeSingle()

  const denied = requireCanEdit(ctx, (asset?.department_id as string | null) ?? null)
  if (denied) return denied

  const { error: assignError } = await ctx.admin
    .from('asset_assignments')
    .update({ returned_at: new Date().toISOString() })
    .eq('asset_id', assetId)
    .is('returned_at', null)

  if (assignError) return { error: assignError.message }

  const { error } = await ctx.admin
    .from('assets')
    .update({ status: 'active', updated_by: ctx.userId })
    .eq('id', assetId)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'asset',
    entityId: assetId,
    entityName: (asset?.name as string) ?? 'Unknown asset',
    action: 'returned',
    changes: assignment?.assigned_to_name
      ? { assignedTo: { old: assignment.assigned_to_name, new: null } }
      : null,
  })

  return null
}

/** Partially or fully return a bulk assignment */
export async function returnBulkAssignment(
  assignmentId: string,
  quantityToReturn: number
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: row } = await ctx.admin
    .from('asset_assignments')
    .select('quantity, assigned_to_name, asset_id, assets(name, department_id)')
    .eq('id', assignmentId)
    .single()

  if (!row) return { error: 'Assignment not found.' }

  const assetJoin = row.assets as
    | { name: string; department_id: string | null }
    | { name: string; department_id: string | null }[]
    | null
  const assetDeptId =
    (Array.isArray(assetJoin) ? assetJoin[0]?.department_id : assetJoin?.department_id) ?? null

  const denied = requireCanEdit(ctx, assetDeptId)
  if (denied) return denied

  const remaining = (row.quantity as number) - quantityToReturn

  if (remaining <= 0) {
    const { error } = await ctx.admin
      .from('asset_assignments')
      .update({ returned_at: new Date().toISOString() })
      .eq('id', assignmentId)
    if (error) return { error: error.message }
  } else {
    const { error } = await ctx.admin
      .from('asset_assignments')
      .update({ quantity: remaining })
      .eq('id', assignmentId)
    if (error) return { error: error.message }
  }

  const assetName =
    (Array.isArray(assetJoin) ? assetJoin[0]?.name : assetJoin?.name) ?? 'Unknown asset'

  await logAudit(ctx, {
    entityType: 'asset',
    entityId: row.asset_id as string,
    entityName: assetName,
    action: 'returned',
    changes: {
      assignedTo: { old: row.assigned_to_name, new: null },
      quantity: { old: row.quantity, new: remaining <= 0 ? 0 : remaining },
    },
  })

  return null
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

  const denied = requireCanEdit(ctx, (asset?.department_id as string | null) ?? null)
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
  assetId: string,
  input: CheckoutFormInput,
  isBulk: boolean
): Promise<{ error: string } | null> {
  const parsed = CheckoutFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  // quantity included here so no separate fetch is needed for bulk validation
  const { data: asset } = await ctx.admin
    .from('assets')
    .select('name, department_id, quantity')
    .eq('id', assetId)
    .maybeSingle()

  const denied = requireCanEdit(ctx, (asset?.department_id as string | null) ?? null)
  if (denied) return denied

  if (isBulk) {
    // Validate: new quantity must not exceed available + what this assignment currently holds
    const [checkedOutByOthers, { data: currentAsgn }] = await Promise.all([
      fetchCheckedOut(ctx.admin, assetId, assignmentId),
      ctx.admin.from('asset_assignments').select('quantity').eq('id', assignmentId).maybeSingle(),
    ])
    const maxAllowed = computeAvailable(asset?.quantity ?? 0, checkedOutByOthers)
    if (input.quantity > maxAllowed) {
      return {
        error: `Only ${maxAllowed} available (${(currentAsgn?.quantity as number | null) ?? 0} currently on this assignment).`,
      }
    }
  }

  const { error } = await ctx.admin
    .from('asset_assignments')
    .update({
      assigned_to_name: input.assignedToName,
      quantity: input.quantity,
      department_id: input.departmentId || null,
      location_id: input.locationId || null,
      expected_return_at: input.expectedReturnAt
        ? new Date(input.expectedReturnAt).toISOString()
        : null,
      notes: input.notes || null,
    })
    .eq('id', assignmentId)

  if (error) return { error: error.message }

  await logAudit(ctx, {
    entityType: 'asset',
    entityId: assetId,
    entityName: (asset?.name as string) ?? 'Unknown asset',
    action: 'updated',
    changes: { assignment: { old: null, new: input.assignedToName } },
  })

  return null
}

/** Count non-deleted assets in the org — used to generate the next asset tag */
export async function getAssetCount(): Promise<number> {
  const ctx = await getContext()
  if (!ctx) return 0

  const { count } = await ctx.admin
    .from('assets')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', ctx.orgId)
    .is('deleted_at', null)

  return count ?? 0
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
  const ctx = await getContext()
  const sanitized = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!sanitized || !ctx) return `${sanitized || prefix}-0001`

  const { data } = await ctx.admin
    .from('assets')
    .select('asset_tag')
    .eq('org_id', ctx.orgId)
    .is('deleted_at', null)
    .ilike('asset_tag', `${sanitized}-%`)

  let max = 0
  for (const { asset_tag } of (data ?? []) as { asset_tag: string }[]) {
    const match = new RegExp(`^${sanitized}-(\\d+)$`, 'i').exec(asset_tag)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > max) max = n
    }
  }

  return `${sanitized}-${String(max + 1).padStart(4, '0')}`
}
