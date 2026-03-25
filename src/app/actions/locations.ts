'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { LocationFormInput } from '@/lib/types'

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

export async function createLocation(input: LocationFormInput): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.admin.from('locations').insert({
    org_id: ctx.orgId,
    name: input.name,
    description: input.description ?? null,
  })

  return error ? { error: error.message } : null
}

export async function updateLocation(
  id: string,
  input: LocationFormInput
): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.admin
    .from('locations')
    .update({ name: input.name, description: input.description ?? null })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  return error ? { error: error.message } : null
}

export async function deleteLocation(id: string): Promise<{ error: string } | null> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.admin
    .from('locations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', ctx.orgId)

  return error ? { error: error.message } : null
}
