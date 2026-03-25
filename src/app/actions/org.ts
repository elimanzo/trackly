'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { CreateOrganizationInput } from '@/lib/types'

export async function createOrganization(
  input: CreateOrganizationInput
): Promise<{ error: string } | never> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Insert the organization
  const { data: org, error: orgError } = await supabase
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

  // Attach org to profile and mark account active
  await supabase
    .from('profiles')
    .update({ org_id: org.id, invite_status: 'active' })
    .eq('id', user.id)

  // Store org_id in user metadata so middleware can read it from the JWT
  // without making a DB call on every request
  await supabase.auth.updateUser({ data: { org_id: org.id } })

  redirect('/setup/departments')
}
