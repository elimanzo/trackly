'use server'

import { headers } from 'next/headers'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

import { logAudit } from './_audit'
import type { ActionClients } from './_context'
import { getContext } from './_context'

export async function updateUserRoleAction(
  orgSlug: string,
  userId: string,
  role: Exclude<UserRole, 'owner'>,
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  const ctx = await getContext(orgSlug, clients)
  if (!ctx) return { error: 'No organisation found' }

  const denied = ctx.requireRole('admin')
  if (denied) return denied

  if (userId === ctx.userId) return { error: 'You cannot change your own role' }

  const { data: target } = await ctx.admin
    .from('user_org_memberships')
    .select('role, profiles(full_name)')
    .eq('user_id', userId)
    .eq('org_id', ctx.orgId)
    .maybeSingle()

  if (!target) return { error: 'User not found' }
  if (target.role === 'owner') return { error: "Cannot change the owner's role" }

  const { error } = await ctx.admin
    .from('user_org_memberships')
    .update({ role })
    .eq('user_id', userId)
    .eq('org_id', ctx.orgId)

  const profileData = target.profiles as { full_name: string } | { full_name: string }[] | null
  const targetName =
    (Array.isArray(profileData) ? profileData[0]?.full_name : profileData?.full_name) ??
    'Unknown user'

  if (!error) {
    await logAudit(ctx, {
      entityType: 'user',
      entityId: userId,
      entityName: targetName,
      action: 'role_changed',
      changes: { role: { old: target.role, new: role } },
    })
  }

  return { error: error?.message ?? null }
}

export async function updateUserDepartmentsAction(
  orgSlug: string,
  userId: string,
  departmentIds: string[],
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  const ctx = await getContext(orgSlug, clients)
  if (!ctx) return { error: 'No organisation found' }

  const denied = ctx.requireRole('admin')
  if (denied) return denied

  // Replace all department memberships for this user within the active org
  const { error: deleteError } = await ctx.admin
    .from('user_departments')
    .delete()
    .eq('user_id', userId)
    .eq('org_id', ctx.orgId)

  if (deleteError) return { error: deleteError.message }

  if (departmentIds.length > 0) {
    const { error: insertError } = await ctx.admin.from('user_departments').insert(
      departmentIds.map((department_id) => ({
        user_id: userId,
        department_id,
        org_id: ctx.orgId,
      }))
    )
    if (insertError) return { error: insertError.message }
  }

  return { error: null }
}

export async function revokeInviteAction(
  orgSlug: string,
  inviteId: string,
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  const ctx = await getContext(orgSlug, clients)
  if (!ctx) return { error: 'No organisation found' }

  const denied = ctx.requireRole('admin')
  if (denied) return denied

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
  // A pending user has a profile row but no membership row yet.
  if (invite?.email) {
    const { data: pendingProfile } = await ctx.admin
      .from('profiles')
      .select('id')
      .eq('email', invite.email)
      .maybeSingle()

    if (pendingProfile) {
      const { data: membership } = await ctx.admin
        .from('user_org_memberships')
        .select('user_id')
        .eq('user_id', pendingProfile.id as string)
        .maybeSingle()

      if (!membership) {
        await ctx.admin.auth.admin.deleteUser(pendingProfile.id as string)
      }
    }
  }

  return { error: null }
}

export async function removeUserAction(
  orgSlug: string,
  userId: string,
  clients?: ActionClients
): Promise<{ error: string } | { error: null }> {
  const ctx = await getContext(orgSlug, clients)
  if (!ctx) return { error: 'No organisation found' }

  const denied = ctx.requireRole('admin')
  if (denied) return denied

  if (userId === ctx.userId) return { error: 'You cannot remove yourself' }

  const { data: target } = await ctx.admin
    .from('user_org_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', ctx.orgId)
    .maybeSingle()

  if (!target) return { error: 'User not found' }
  if (target.role === 'owner') return { error: 'Cannot remove the org owner' }

  const { error } = await ctx.admin
    .from('user_org_memberships')
    .update({ invite_status: 'deactivated' })
    .eq('user_id', userId)
    .eq('org_id', ctx.orgId)

  if (error) return { error: error.message }

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

  const { data: membership } = await admin
    .from('user_org_memberships')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.org_id) return { error: 'You are not in an organisation' }
  if (membership.role === 'owner')
    return { error: 'Owners cannot leave — transfer ownership or delete the organisation first' }

  await admin
    .from('user_departments')
    .delete()
    .eq('user_id', user.id)
    .eq('org_id', membership.org_id)

  const { error } = await admin
    .from('user_org_memberships')
    .delete()
    .eq('user_id', user.id)
    .eq('org_id', membership.org_id)

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

  const { data: membership } = await admin
    .from('user_org_memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membership?.org_id)
    return { error: 'Leave or delete your organisation before deleting your account' }

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

  // Only send resets to known users who have at least one active membership
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalised)
    .maybeSingle()

  if (!profile) return { error: null }

  const { data: membership } = await admin
    .from('user_org_memberships')
    .select('user_id')
    .eq('user_id', profile.id as string)
    .maybeSingle()

  if (!membership) return { error: null }

  const headersList = await headers()
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? headersList.get('origin') ?? 'http://localhost:3000'

  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/reset-password?recovery=1')}`

  const supabase = clients?.supabase ?? (await createClient())
  await supabase.auth.resetPasswordForEmail(normalised, { redirectTo })

  return { error: null }
}
