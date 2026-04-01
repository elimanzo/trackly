'use server'

import { headers } from 'next/headers'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

import { logAudit } from './_audit'
import type { ActionClients } from './_context'
import { getContext } from './_context'

export async function updateUserRoleAction(
  userId: string,
  role: Exclude<UserRole, 'owner'>,
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  const ctx = await getContext(clients)
  if (!ctx) return { error: 'No organisation found' }

  const denied = ctx.requireRole('admin')
  if (denied) return denied

  if (userId === ctx.userId) return { error: 'You cannot change your own role' }

  const { data: target } = await ctx.admin
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .eq('org_id', ctx.orgId)
    .single()

  if (!target) return { error: 'User not found' }
  if (target.role === 'owner') return { error: "Cannot change the owner's role" }

  const { error } = await ctx.admin
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .eq('org_id', ctx.orgId)

  if (!error) {
    await logAudit(ctx, {
      entityType: 'user',
      entityId: userId,
      entityName: (target.full_name as string) ?? 'Unknown user',
      action: 'role_changed',
      changes: { role: { old: target.role, new: role } },
    })
  }

  return { error: error?.message ?? null }
}

export async function updateUserDepartmentsAction(
  userId: string,
  departmentIds: string[],
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  const ctx = await getContext(clients)
  if (!ctx) return { error: 'No organisation found' }

  const denied = ctx.requireRole('admin')
  if (denied) return denied

  // Replace all department memberships in a transaction-like manner
  const { error: deleteError } = await ctx.admin
    .from('user_departments')
    .delete()
    .eq('user_id', userId)

  if (deleteError) return { error: deleteError.message }

  if (departmentIds.length > 0) {
    const { error: insertError } = await ctx.admin
      .from('user_departments')
      .insert(departmentIds.map((department_id) => ({ user_id: userId, department_id })))
    if (insertError) return { error: insertError.message }
  }

  return { error: null }
}

export async function revokeInviteAction(
  inviteId: string,
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  const ctx = await getContext(clients)
  if (!ctx) return { error: 'No organisation found' }

  const denied = ctx.requireRole('admin')
  if (denied) return denied

  // Grab the email before deleting so we can clean up the auth user
  const { data: invite } = await ctx.admin
    .from('invites')
    .select('email')
    .eq('id', inviteId)
    .eq('org_id', ctx.orgId)
    .maybeSingle()

  const { error } = await ctx.admin
    .from('invites')
    .delete()
    .eq('id', inviteId)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  // Remove the pending auth user so the same email can be re-invited.
  // inviteUserByEmail creates an auth user immediately; without deleting it
  // a subsequent invite to the same address would fail with "already registered".
  // The on_auth_user_created trigger creates a profile with org_id = null for
  // pending users, so we can look up the user ID that way.
  if (invite?.email) {
    const { data: pendingProfile } = await ctx.admin
      .from('profiles')
      .select('id')
      .eq('email', invite.email)
      .is('org_id', null)
      .maybeSingle()

    if (pendingProfile) {
      await ctx.admin.auth.admin.deleteUser(pendingProfile.id as string)
      // profile row is removed automatically via ON DELETE CASCADE on auth.users
    }
  }

  return { error: null }
}

export async function removeUserAction(
  userId: string,
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  const ctx = await getContext(clients)
  if (!ctx) return { error: 'No organisation found' }

  const denied = ctx.requireRole('admin')
  if (denied) return denied

  if (userId === ctx.userId) return { error: 'You cannot remove yourself' }

  const { data: target } = await ctx.admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .eq('org_id', ctx.orgId)
    .single()

  if (!target) return { error: 'User not found' }
  if (target.role === 'owner') return { error: 'Cannot remove the org owner' }

  const { error } = await ctx.admin
    .from('profiles')
    .update({ invite_status: 'deactivated' })
    .eq('id', userId)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

  // Delete the auth user so they can be re-invited cleanly later
  await ctx.admin.auth.admin.deleteUser(userId)

  return { error: null }
}

// ---------------------------------------------------------------------------
// leaveOrgAction
// ---------------------------------------------------------------------------

export async function leaveOrgAction(): Promise<{ error: string } | { error: null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.org_id) return { error: 'You are not in an organisation' }
  if (profile.role === 'owner')
    return { error: 'Owners cannot leave — delete the organisation instead' }

  await admin.from('user_departments').delete().eq('user_id', user.id)

  const { error } = await admin
    .from('profiles')
    .update({
      org_id: null,
      role: 'viewer',
      invite_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  return { error: error?.message ?? null }
}

// ---------------------------------------------------------------------------
// deleteAccountAction
// ---------------------------------------------------------------------------

export async function deleteAccountAction(): Promise<{ error: string } | { error: null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.org_id)
    return { error: 'Leave or delete your organisation before deleting your account' }

  // Deleting the auth user cascades to the profile row
  const { error } = await admin.auth.admin.deleteUser(user.id)

  return { error: error?.message ?? null }
}

// ---------------------------------------------------------------------------
// requestPasswordResetAction
// ---------------------------------------------------------------------------

export async function requestPasswordResetAction(
  email: string,
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  const normalised = email.toLowerCase().trim()
  const admin = clients?.admin ?? createAdminClient()

  // Only send resets to known, active members — prevents strangers from
  // spamming reset emails to emails they don't own.
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalised)
    .not('org_id', 'is', null)
    .maybeSingle()

  // Always return success — don't reveal whether the email is registered.
  if (!profile) return { error: null }

  const headersList = await headers()
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? headersList.get('origin') ?? 'http://localhost:3000'

  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/reset-password?recovery=1')}`

  // Use the regular server client — resetPasswordForEmail actually sends the
  // email. admin.generateLink only returns the URL without sending.
  const supabase = clients?.supabase ?? (await createClient())
  await supabase.auth.resetPasswordForEmail(normalised, { redirectTo })

  return { error: null }
}
