'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { AssetFormInput, CheckoutFormInput } from '@/lib/types'

async function getContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.org_id) return null
  return { userId: user.id, orgId: profile.org_id as string, admin }
}

export async function createAsset(
  input: AssetFormInput
): Promise<{ error: string } | { id: string }> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

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
  return { id: data.id as string }
}

export async function updateAsset(
  id: string,
  input: AssetFormInput
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

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
  return null
}

export async function deleteAsset(id: string): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.admin
    .from('assets')
    .update({ deleted_at: new Date().toISOString(), updated_by: ctx.userId })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  return error ? { error: error.message } : null
}

export async function checkoutAsset(
  assetId: string,
  input: CheckoutFormInput,
  assignedByName: string,
  isBulk: boolean
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  if (isBulk) {
    // Validate available stock
    const { data: asset } = await ctx.admin
      .from('assets')
      .select('quantity')
      .eq('id', assetId)
      .single()
    const { data: activeRows } = await ctx.admin
      .from('asset_assignments')
      .select('quantity')
      .eq('asset_id', assetId)
      .is('returned_at', null)
    const checkedOut = (activeRows ?? []).reduce(
      (sum: number, r: { quantity: number }) => sum + (r.quantity ?? 1),
      0
    )
    const available = (asset?.quantity ?? 0) - checkedOut
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

  return null
}

/** Return a serialized (non-bulk) asset entirely */
export async function returnAsset(assetId: string): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

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

  return error ? { error: error.message } : null
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
    .select('quantity')
    .eq('id', assignmentId)
    .single()

  if (!row) return { error: 'Assignment not found.' }

  const remaining = (row.quantity as number) - quantityToReturn

  if (remaining <= 0) {
    const { error } = await ctx.admin
      .from('asset_assignments')
      .update({ returned_at: new Date().toISOString() })
      .eq('id', assignmentId)
    return error ? { error: error.message } : null
  }

  const { error } = await ctx.admin
    .from('asset_assignments')
    .update({ quantity: remaining })
    .eq('id', assignmentId)

  return error ? { error: error.message } : null
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
    .select('quantity')
    .eq('id', assetId)
    .single()

  const newQuantity = (asset?.quantity ?? 0) + additionalQuantity

  const { error } = await ctx.admin
    .from('assets')
    .update({ quantity: newQuantity, updated_by: ctx.userId })
    .eq('id', assetId)
    .eq('org_id', ctx.orgId)

  return error ? { error: error.message } : null
}

/** Edit an existing checkout assignment */
export async function updateAssignment(
  assignmentId: string,
  assetId: string,
  input: CheckoutFormInput,
  isBulk: boolean
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  if (isBulk) {
    // Validate: new quantity must not exceed available + what this assignment currently holds
    const { data: asset } = await ctx.admin
      .from('assets')
      .select('quantity')
      .eq('id', assetId)
      .single()
    const { data: activeRows } = await ctx.admin
      .from('asset_assignments')
      .select('id, quantity')
      .eq('asset_id', assetId)
      .is('returned_at', null)
    const currentRow = (activeRows ?? []).find(
      (r: { id: string; quantity: number }) => r.id === assignmentId
    )
    const otherCheckedOut = (activeRows ?? [])
      .filter((r: { id: string; quantity: number }) => r.id !== assignmentId)
      .reduce((sum: number, r: { quantity: number }) => sum + (r.quantity ?? 1), 0)
    const maxAllowed = (asset?.quantity ?? 0) - otherCheckedOut
    if (input.quantity > maxAllowed) {
      return {
        error: `Only ${maxAllowed} available (${currentRow?.quantity ?? 0} currently on this assignment).`,
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

  return error ? { error: error.message } : null
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
