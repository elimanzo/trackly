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
    .select('token')
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) return { destination: null }

  // Send to the in-app confirmation page so the user can consciously accept
  return { destination: `/invite/confirm?token=${invite.token as string}` }
}

// Takes userId directly — called from the auth callback where the session is
// already established client-side, so we avoid a server-side getUser() call
// that may fail before the session cookie is written.
export async function googleSignInDestination(
  userId: string,
  clients?: ActionClients
): Promise<{ destination: string }> {
  const admin = clients?.admin ?? createAdminClient()
  const { data: memberships } = await admin
    .from('user_org_memberships')
    .select('org_id')
    .eq('user_id', userId)

  if (!memberships?.length) return { destination: '/org/new' }
  if (memberships.length === 1) {
    const { data: org } = await admin
      .from('organizations')
      .select('slug')
      .eq('id', memberships[0]!.org_id)
      .maybeSingle()
    if (org?.slug) return { destination: `/orgs/${org.slug as string}/dashboard` }
  }
  return { destination: '/orgs' }
}
