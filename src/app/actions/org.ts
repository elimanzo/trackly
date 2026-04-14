'use server'

import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { CreateOrganizationInput, UpdateOrganizationInput } from '@/lib/types'

import { logAudit } from './_audit'
import { getAdminCtx, getContext } from './_context'
import { PG, mapDbError } from './_db'

export async function checkOrgAvailability(
  name: string,
  slug: string
): Promise<{ nameTaken: boolean; slugTaken: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { nameTaken: false, slugTaken: false }

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
): Promise<{ error: string } | { error: null; slug: string }> {
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
    if (orgError.code === PG.UNIQUE_VIOLATION) {
      return {
        error:
          'That organization name or URL slug is already taken. Please go back and choose a different one.',
      }
    }
    return { error: mapDbError(orgError) }
  }

  const [{ error: membershipError }, { error: deptError }, { error: catError }] = await Promise.all(
    [
      admin.from('user_org_memberships').insert({
        user_id: user.id,
        org_id: orgData.id,
        role: 'owner',
        invite_status: 'active',
      }),
      departments.length > 0
        ? admin
            .from('departments')
            .insert(departments.map((name) => ({ name, org_id: orgData.id })))
        : Promise.resolve({ error: null }),
      categories.length > 0
        ? admin.from('categories').insert(categories.map((name) => ({ name, org_id: orgData.id })))
        : Promise.resolve({ error: null }),
    ]
  )

  if (membershipError) return { error: membershipError.message }
  if (deptError) return { error: deptError.message }
  if (catError) return { error: catError.message }

  return { error: null, slug: org.slug }
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
    if (orgError.code === PG.UNIQUE_VIOLATION) {
      return { error: 'That URL slug is already taken. Try a different one.' }
    }
    return { error: mapDbError(orgError) }
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
  orgSlug: string,
  input: UpdateOrganizationInput
): Promise<{ error: string } | { error: null }> {
  const ctx = await getAdminCtx(orgSlug)
  if ('error' in ctx) return ctx

  const isOwner = ctx.role === 'owner'

  const patch: Record<string, unknown> = {}
  if (isOwner && input.name !== undefined) patch.name = input.name
  if (isOwner && input.slug !== undefined) patch.slug = input.slug
  if (input.departmentLabel !== undefined) patch.department_label = input.departmentLabel
  if (input.dashboardConfig !== undefined) patch.dashboard_config = input.dashboardConfig
  if (input.assetTableConfig !== undefined) patch.asset_table_config = input.assetTableConfig
  if (input.reportConfig !== undefined) patch.report_config = input.reportConfig

  const [{ data: org }, { error }] = await Promise.all([
    ctx.admin.from('organizations').select('name').eq('id', ctx.orgId).maybeSingle(),
    ctx.admin.from('organizations').update(patch).eq('id', ctx.orgId),
  ])

  if (error) {
    if (error.code === PG.UNIQUE_VIOLATION) return { error: 'That URL slug is already taken.' }
    return { error: mapDbError(error) }
  }

  await logAudit(ctx, {
    entityType: 'org',
    entityId: ctx.orgId,
    entityName: (org?.name as string) ?? 'Unknown',
    action: 'updated',
  })

  return { error: null }
}

// ---------------------------------------------------------------------------
// deleteOrgAction
// ---------------------------------------------------------------------------

export async function deleteOrgAction(
  orgSlug: string
): Promise<{ error: string } | { error: null }> {
  const ctx = await getContext(orgSlug)
  if (!ctx) return { error: 'Not authenticated' }
  if (ctx.role !== 'owner') return { error: 'Only the organisation owner can delete it' }

  const { data: org } = await ctx.admin
    .from('organizations')
    .select('name')
    .eq('id', ctx.orgId)
    .maybeSingle()

  // Log before deletion — the row will be gone after
  await logAudit(ctx, {
    entityType: 'org',
    entityId: ctx.orgId,
    entityName: (org?.name as string) ?? 'Unknown',
    action: 'deleted',
  })

  // Delete the org — cascades departments, categories, locations, vendors,
  // assets, invites, audit_logs, user_departments, user_org_memberships
  const { error } = await ctx.admin.from('organizations').delete().eq('id', ctx.orgId)

  return { error: error?.message ?? null }
}
