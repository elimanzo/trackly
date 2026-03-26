'use server'

import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { CreateOrganizationInput, UpdateOrganizationInput } from '@/lib/types'

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<{ error: string } | never> {
  // Auth check via server client (reads session from cookies)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use admin client for DB writes — bypasses RLS, safe because we've
  // already verified the user identity above via getUser()
  const admin = createAdminClient()

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: input.name, slug: input.slug, owner_id: user.id })
    .select('id')
    .single()

  if (orgError) {
    if (orgError.code === '23505') {
      return { error: 'That URL slug is already taken. Try a different one.' }
    }
    return { error: orgError.message }
  }

  await admin.from('profiles').update({ org_id: org.id, invite_status: 'active' }).eq('id', user.id)

  redirect('/setup/departments')
}

export async function updateOrganization(
  input: UpdateOrganizationInput
): Promise<{ error: string } | { error: null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()

  if (!profile?.org_id) return { error: 'No organisation found' }

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.slug !== undefined) patch.slug = input.slug
  if (input.departmentLabel !== undefined) patch.department_label = input.departmentLabel
  if (input.dashboardConfig !== undefined) patch.dashboard_config = input.dashboardConfig
  if (input.assetTableConfig !== undefined) patch.asset_table_config = input.assetTableConfig

  const { error } = await admin.from('organizations').update(patch).eq('id', profile.org_id)

  if (error) {
    if (error.code === '23505') return { error: 'That URL slug is already taken.' }
    return { error: error.message }
  }

  return { error: null }
}
