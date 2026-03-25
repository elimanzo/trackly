'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { DepartmentFormInput } from '@/lib/types'

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

export async function createDepartment(
  input: DepartmentFormInput
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.admin.from('departments').insert({
    org_id: ctx.orgId,
    name: input.name,
    description: input.description ?? null,
  })

  return error ? { error: error.message } : null
}

export async function updateDepartment(
  id: string,
  input: DepartmentFormInput
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.admin
    .from('departments')
    .update({ name: input.name, description: input.description ?? null })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  return error ? { error: error.message } : null
}

export async function deleteDepartment(id: string): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.admin
    .from('departments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  return error ? { error: error.message } : null
}
