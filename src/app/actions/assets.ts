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
      category_id: input.categoryId,
      department_id: input.departmentId,
      location_id: input.locationId,
      status: input.status,
      purchase_date: input.purchaseDate,
      purchase_cost: input.purchaseCost,
      warranty_expiry: input.warrantyExpiry,
      vendor_id: input.vendorId,
      notes: input.notes || null,
      image_url: input.imageUrl || null,
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
      category_id: input.categoryId,
      department_id: input.departmentId,
      location_id: input.locationId,
      status: input.status,
      purchase_date: input.purchaseDate,
      purchase_cost: input.purchaseCost,
      warranty_expiry: input.warrantyExpiry,
      vendor_id: input.vendorId,
      notes: input.notes || null,
      image_url: input.imageUrl || null,
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
  assignedByName: string
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { error: assignError } = await ctx.admin.from('asset_assignments').insert({
    asset_id: assetId,
    assigned_to_user_id: input.assignedToUserId,
    assigned_to_name: input.assignedToName,
    assigned_by: ctx.userId,
    assigned_by_name: assignedByName,
    expected_return_at: input.expectedReturnAt
      ? new Date(input.expectedReturnAt).toISOString()
      : null,
    notes: input.notes || null,
  })

  if (assignError) return { error: assignError.message }

  const { error } = await ctx.admin
    .from('assets')
    .update({ status: 'checked_out', updated_by: ctx.userId })
    .eq('id', assetId)
    .eq('org_id', ctx.orgId)

  return error ? { error: error.message } : null
}

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
