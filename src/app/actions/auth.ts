'use server'

import { createAdminClient } from '@/lib/supabase/admin'

import type { ActionClients } from './_context'

export async function completeInviteForGoogleUser(
  userId: string,
  email: string,
  clients?: ActionClients
): Promise<{ destination: string | null } | { error: string }> {
  const admin = clients?.admin ?? createAdminClient()

  const { data: invite } = await admin
    .from('invites')
    .select('*')
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) return { destination: null }

  // Multi-org: always accept the invite — users can belong to multiple orgs
  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    updated_at: new Date().toISOString(),
  })
  if (profileError) return { error: profileError.message }

  const { error: membershipError } = await admin.from('user_org_memberships').upsert({
    user_id: userId,
    org_id: invite.org_id,
    role: invite.role as string,
    invite_status: 'active',
  })
  if (membershipError) return { error: membershipError.message }

  const deptIds = (invite.department_ids as string[] | null) ?? []
  if (deptIds.length > 0) {
    const { error: deptError } = await admin.from('user_departments').insert(
      deptIds.map((department_id: string) => ({
        user_id: userId,
        department_id,
        org_id: invite.org_id,
      }))
    )
    if (deptError) return { error: deptError.message }
  }

  await admin
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id as string)

  return { destination: '/dashboard' }
}

// Takes userId directly — called from the auth callback where the session is
// already established client-side, so we avoid a server-side getUser() call
// that may fail before the session cookie is written.
export async function googleSignInDestination(
  userId: string,
  clients?: ActionClients
): Promise<{ destination: string }> {
  const admin = clients?.admin ?? createAdminClient()
  const { data: membership } = await admin
    .from('user_org_memberships')
    .select('org_id')
    .eq('user_id', userId)
    .maybeSingle()

  return { destination: membership?.org_id ? '/dashboard' : '/org/new' }
}
