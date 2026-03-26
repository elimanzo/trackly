'use server'

import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Invite } from '@/lib/types'

// ---------------------------------------------------------------------------
// sendInviteAction
// ---------------------------------------------------------------------------

export async function sendInviteAction(
  email: string,
  role: Invite['role'],
  departmentIds: string[] = []
): Promise<{ error: string } | { error: null }> {
  email = email.toLowerCase().trim()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Fetch inviter profile + org name
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id, full_name, organizations(name)')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return { error: 'No organisation found' }

  // Prevent duplicate pending invites
  const { data: existing } = await admin
    .from('invites')
    .select('id')
    .eq('email', email)
    .eq('org_id', profile.org_id)
    .is('accepted_at', null)
    .maybeSingle()

  if (existing) return { error: 'A pending invite already exists for this email' }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: insertError } = await admin.from('invites').insert({
    org_id: profile.org_id,
    email,
    role,
    token: crypto.randomUUID(),
    invited_by: user.id,
    invited_by_name: profile.full_name,
    expires_at: expiresAt,
    department_ids: departmentIds,
  })

  if (insertError) return { error: insertError.message }

  // Send invite email via Supabase (routes through configured SMTP)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const orgName = (profile.organizations as { name: string } | null)?.name ?? ''
  const next = `/invite/accept?org=${encodeURIComponent(orgName)}`
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`

  const { error: authError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })

  if (authError) {
    // Roll back the invite row so the user can try again
    await admin.from('invites').delete().eq('email', email).eq('org_id', profile.org_id)
    return { error: authError.message }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// acceptInviteAction
// ---------------------------------------------------------------------------

export async function acceptInviteAction(
  fullName: string,
  password: string
): Promise<{ error: string } | { error: null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Find the pending invite for this email (normalize to lowercase — Supabase
  // lowercases emails on auth user creation so mixed-case invites must match)
  const { data: invite } = await admin
    .from('invites')
    .select('*')
    .eq('email', user.email!.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) return { error: 'Invite not found or has expired. Ask your admin to resend it.' }

  // Upsert the profile (trigger may have created a bare row already)
  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    org_id: invite.org_id,
    full_name: fullName,
    email: user.email,
    role: invite.role as string,
    invite_status: 'active',
    updated_at: new Date().toISOString(),
  })

  if (profileError) return { error: profileError.message }

  // Set the user's password so they can log in with email + password going forward
  const { error: pwError } = await admin.auth.admin.updateUserById(user.id, { password })
  if (pwError) return { error: pwError.message }

  // Apply pre-assigned departments from the invite
  const deptIds = (invite.department_ids as string[] | null) ?? []
  if (deptIds.length > 0) {
    await admin
      .from('user_departments')
      .insert(deptIds.map((department_id: string) => ({ user_id: user.id, department_id })))
  }

  // Mark invite accepted
  await admin
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id as string)

  return { error: null }
}
