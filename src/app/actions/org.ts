'use server'

import { redirect } from 'next/navigation'

import { createPolicy } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { CreateOrganizationInput, UpdateOrganizationInput } from '@/lib/types'
import type { UserRole } from '@/lib/types'

export async function checkOrgAvailability(
  name: string,
  slug: string
): Promise<{ nameTaken: boolean; slugTaken: boolean }> {
  const admin = createAdminClient()
  const [nameResult, slugResult] = await Promise.all([
    admin.from('organizations').select('id').ilike('name', name).maybeSingle(),
    admin.from('organizations').select('id').eq('slug', slug).maybeSingle(),
  ])
  return {
    nameTaken: !!nameResult.data,
    slugTaken: !!slugResult.data,
  }
}

export async function completeOnboardingSetup(
  org: { name: string; slug: string },
  departments: string[],
  categories: string[]
): Promise<{ error: string } | { error: null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: orgData, error: orgError } = await admin
    .from('organizations')
    .insert({ name: org.name, slug: org.slug, owner_id: user.id })
    .select('id')
    .single()

  if (orgError) {
    if (orgError.code === '23505') {
      return {
        error:
          'That organization name or URL slug is already taken. Please go back and choose a different one.',
      }
    }
    return { error: orgError.message }
  }

  const { error: membershipError } = await admin.from('user_org_memberships').insert({
    user_id: user.id,
    org_id: orgData.id,
    role: 'owner',
    invite_status: 'active',
  })
  if (membershipError) return { error: membershipError.message }

  if (departments.length > 0) {
    const { error: deptError } = await admin
      .from('departments')
      .insert(departments.map((name) => ({ name, org_id: orgData.id })))
    if (deptError) return { error: deptError.message }
  }

  if (categories.length > 0) {
    const { error: catError } = await admin
      .from('categories')
      .insert(categories.map((name) => ({ name, org_id: orgData.id })))
    if (catError) return { error: catError.message }
  }

  return { error: null }
}

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  await admin.from('user_org_memberships').insert({
    user_id: user.id,
    org_id: org.id,
    role: 'owner',
    invite_status: 'active',
  })

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

  const { data: membership } = await admin
    .from('user_org_memberships')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.org_id) return { error: 'No organisation found' }
  const denied = createPolicy({ role: membership.role as UserRole, departmentIds: [] }).enforce(
    'department:manage'
  )
  if (denied) return denied

  const isOwner = membership.role === 'owner'

  const patch: Record<string, unknown> = {}
  if (isOwner && input.name !== undefined) patch.name = input.name
  if (isOwner && input.slug !== undefined) patch.slug = input.slug
  if (input.departmentLabel !== undefined) patch.department_label = input.departmentLabel
  if (input.dashboardConfig !== undefined) patch.dashboard_config = input.dashboardConfig
  if (input.assetTableConfig !== undefined) patch.asset_table_config = input.assetTableConfig
  if (input.reportConfig !== undefined) patch.report_config = input.reportConfig

  const { error } = await admin.from('organizations').update(patch).eq('id', membership.org_id)

  if (error) {
    if (error.code === '23505') return { error: 'That URL slug is already taken.' }
    return { error: error.message }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// deleteOrgAction
// ---------------------------------------------------------------------------

export async function deleteOrgAction(): Promise<{ error: string } | { error: null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: membership } = await admin
    .from('user_org_memberships')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.org_id) return { error: 'No organisation found' }
  if (membership.role !== 'owner') return { error: 'Only the organisation owner can delete it' }

  const orgId = membership.org_id as string

  // Delete the org — cascades departments, categories, locations, vendors,
  // assets, invites, audit_logs, user_departments, user_org_memberships
  const { error } = await admin.from('organizations').delete().eq('id', orgId)

  return { error: error?.message ?? null }
}
