'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import type { ActionClients } from './_context'

export async function completeInviteForGoogleUser(
  userId: string,
  email: string,
  clients?: ActionClients
): Promise<{ destination: string | null } | { error: string }> {
  const admin = clients?.admin ?? createAdminClient()

  // Look up a pending, non-expired invite for this email
  const { data: invite } = await admin
    .from('invites')
    .select('*')
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) return { destination: null }

  // Check if the user already belongs to an org
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.org_id) return { destination: '/invite/conflict' }

  // Apply invite: upsert profile, assign departments, mark accepted
  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    org_id: invite.org_id,
    role: invite.role as string,
    invite_status: 'active',
    updated_at: new Date().toISOString(),
  })
  if (profileError) return { error: profileError.message }

  const deptIds = (invite.department_ids as string[] | null) ?? []
  if (deptIds.length > 0) {
    const { error: deptError } = await admin
      .from('user_departments')
      .insert(deptIds.map((department_id: string) => ({ user_id: userId, department_id })))
    if (deptError) return { error: deptError.message }
  }

  await admin
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id as string)

  return { destination: '/dashboard' }
}

export async function googleSignInDestination(
  clients?: ActionClients
): Promise<{ destination: string } | { error: string }> {
  const supabase = clients?.supabase ?? (await createClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = clients?.admin ?? createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  return { destination: profile?.org_id ? '/dashboard' : '/org/new' }
}
