'use server'

import { createClient as createRawClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Invite } from '@/lib/types'

import type { ActionClients } from './_context'

// ---------------------------------------------------------------------------
// sendInviteAction
// ---------------------------------------------------------------------------

export async function sendInviteAction(
  email: string,
  role: Invite['role'],
  departmentIds: string[] = [],
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  email = email.toLowerCase().trim()
  const supabase = clients?.supabase ?? (await createClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = clients?.admin ?? createAdminClient()

  // Fetch actor's active membership and display name in parallel
  const [{ data: actorMembership }, { data: actorProfile }] = await Promise.all([
    admin
      .from('user_org_memberships')
      .select('org_id, organizations(name)')
      .eq('user_id', user.id)
      .maybeSingle(),
    admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ])

  if (!actorMembership?.org_id) return { error: 'No organisation found' }

  const orgId = actorMembership.org_id as string
  const orgs = actorMembership.organizations as { name: string }[] | { name: string } | null
  const orgName = (Array.isArray(orgs) ? orgs[0]?.name : orgs?.name) ?? ''
  const actorName = (actorProfile?.full_name as string) ?? 'Your team'

  // Prevent duplicate pending invites
  const { data: existing } = await admin
    .from('invites')
    .select('id')
    .eq('email', email)
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .maybeSingle()

  if (existing) return { error: 'A pending invite already exists for this email' }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: newInvite, error: insertError } = await admin
    .from('invites')
    .insert({
      org_id: orgId,
      email,
      role,
      token: crypto.randomUUID(),
      invited_by: user.id,
      invited_by_name: actorName,
      expires_at: expiresAt,
      department_ids: departmentIds,
    })
    .select('id, token')
    .single()

  if (insertError) return { error: insertError.message }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const invite = newInvite as { id: string; token: string }

  // Check whether an auth user already exists for this email. If so, send a
  // magic link instead of inviteUserByEmail (which fails for existing users).
  // Existing users land on the in-app confirmation page; new users go through
  // the password-setup flow at /invite/accept.
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    const confirmNext = `/invite/confirm?token=${invite.token}`
    const confirmRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(confirmNext)}`
    const implicitClient = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: 'implicit', persistSession: false } }
    )
    const { error: otpError } = await implicitClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: confirmRedirectTo },
    })
    if (otpError) {
      await admin.from('invites').delete().eq('id', invite.id)
      return { error: otpError.message }
    }
    return { error: null }
  }

  const newNext = `/invite/accept?org=${encodeURIComponent(orgName)}`
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(newNext)}`
  const { error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { org_name: orgName, invited_by_name: actorName },
  })

  if (authError) {
    const alreadyExists =
      authError.message.toLowerCase().includes('already been registered') ||
      authError.message.toLowerCase().includes('already registered') ||
      authError.message.toLowerCase().includes('user already exists')

    if (!alreadyExists) {
      await admin.from('invites').delete().eq('id', invite.id)
      return { error: authError.message }
    }
  }

  return { error: null }
}

// ---------------------------------------------------------------------------
// acceptInviteViaGoogleAction
// ---------------------------------------------------------------------------

export async function acceptInviteViaGoogleAction(
  fullName: string,
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  const supabase = clients?.supabase ?? (await createClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please use the invite link again.' }

  const admin = clients?.admin ?? createAdminClient()

  const { data: invite } = await admin
    .from('invites')
    .select('*')
    .eq('email', user.email!.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) return { error: 'Invite not found or has expired. Ask your admin to resend it.' }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    full_name: fullName,
    email: user.email,
    updated_at: new Date().toISOString(),
  })
  if (profileError) return { error: profileError.message }

  const { error: membershipError } = await admin.from('user_org_memberships').upsert({
    user_id: user.id,
    org_id: invite.org_id,
    role: invite.role as string,
    invite_status: 'active',
  })
  if (membershipError) return { error: membershipError.message }

  const deptIds = (invite.department_ids as string[] | null) ?? []
  if (deptIds.length > 0) {
    const { error: deptError } = await admin.from('user_departments').insert(
      deptIds.map((department_id: string) => ({
        user_id: user.id,
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

  return { error: null }
}

// ---------------------------------------------------------------------------
// acceptInviteAction
// ---------------------------------------------------------------------------

export async function acceptInviteAction(
  fullName: string,
  password: string
): Promise<{ error: string } | { error: null; email: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please use the invite link again.' }

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('invites')
    .select('*')
    .eq('email', user.email!.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) return { error: 'Invite not found or has expired. Ask your admin to resend it.' }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    full_name: fullName,
    email: user.email,
    updated_at: new Date().toISOString(),
  })
  if (profileError) return { error: profileError.message }

  const { error: membershipError } = await admin.from('user_org_memberships').upsert({
    user_id: user.id,
    org_id: invite.org_id,
    role: invite.role as string,
    invite_status: 'active',
  })
  if (membershipError) return { error: membershipError.message }

  const { error: pwError } = await admin.auth.admin.updateUserById(user.id, { password })
  if (pwError) return { error: pwError.message }

  const deptIds = (invite.department_ids as string[] | null) ?? []
  if (deptIds.length > 0) {
    const { error: deptError } = await admin.from('user_departments').insert(
      deptIds.map((department_id: string) => ({
        user_id: user.id,
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

  return { error: null, email: user.email!.toLowerCase() }
}

// ---------------------------------------------------------------------------
// getInviteByTokenAction — fetch invite details for the confirmation page
// ---------------------------------------------------------------------------

export async function getInviteByTokenAction(
  token: string,
  clients?: ActionClients
): Promise<{ error: string } | { orgName: string; orgSlug: string; role: string }> {
  const supabase = clients?.supabase ?? (await createClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = clients?.admin ?? createAdminClient()

  const { data: invite } = await admin
    .from('invites')
    .select('role, email, organizations(name, slug)')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) return { error: 'Invite not found or has expired. Ask your admin to resend it.' }

  if ((invite.email as string).toLowerCase() !== user.email!.toLowerCase()) {
    return { error: 'This invite was sent to a different email address.' }
  }

  const orgs = invite.organizations as
    | { name: string; slug: string }[]
    | { name: string; slug: string }
    | null
  const org = Array.isArray(orgs) ? orgs[0] : orgs
  return { orgName: org?.name ?? '', orgSlug: org?.slug ?? '', role: invite.role as string }
}

// ---------------------------------------------------------------------------
// acceptAuthenticatedInviteAction — accept invite for an already-signed-in user
// ---------------------------------------------------------------------------

export async function acceptAuthenticatedInviteAction(
  token: string,
  clients?: ActionClients
): Promise<{ error: string } | { orgSlug: string }> {
  const supabase = clients?.supabase ?? (await createClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expired. Please sign in again.' }

  const admin = clients?.admin ?? createAdminClient()

  const { data: invite } = await admin
    .from('invites')
    .select('*, organizations(slug)')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) return { error: 'Invite not found or has expired. Ask your admin to resend it.' }

  if ((invite.email as string).toLowerCase() !== user.email!.toLowerCase()) {
    return { error: 'This invite was sent to a different email address.' }
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email!.split('@')[0]

  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    full_name: fullName,
    email: user.email,
    updated_at: new Date().toISOString(),
  })
  if (profileError) return { error: profileError.message }

  const { error: membershipError } = await admin.from('user_org_memberships').upsert({
    user_id: user.id,
    org_id: invite.org_id,
    role: invite.role as string,
    invite_status: 'active',
  })
  if (membershipError) return { error: membershipError.message }

  const deptIds = (invite.department_ids as string[] | null) ?? []
  if (deptIds.length > 0) {
    const { error: deptError } = await admin.from('user_departments').insert(
      deptIds.map((department_id: string) => ({
        user_id: user.id,
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

  const orgs = invite.organizations as { slug: string }[] | { slug: string } | null
  const orgSlug = (Array.isArray(orgs) ? orgs[0]?.slug : orgs?.slug) ?? ''
  return { orgSlug }
}
