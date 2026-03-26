'use server'

import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

async function getActorProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  return { actorId: user.id, profile, admin }
}

export async function updateUserRoleAction(
  userId: string,
  role: Exclude<UserRole, 'owner'>
): Promise<{ error: string } | { error: null }> {
  const { actorId, profile, admin } = await getActorProfile()

  if (!profile?.org_id) return { error: 'No organisation found' }
  if (!['owner', 'admin'].includes(profile.role)) return { error: 'Not authorised' }
  if (userId === actorId) return { error: 'You cannot change your own role' }

  // Prevent changing the org owner's role
  const { data: target } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .eq('org_id', profile.org_id)
    .single()

  if (!target) return { error: 'User not found' }
  if (target.role === 'owner') return { error: "Cannot change the owner's role" }

  const { error } = await admin
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .eq('org_id', profile.org_id)

  return { error: error?.message ?? null }
}

export async function updateUserDepartmentsAction(
  userId: string,
  departmentIds: string[]
): Promise<{ error: string } | { error: null }> {
  const { profile, admin } = await getActorProfile()

  if (!profile?.org_id) return { error: 'No organisation found' }
  if (!['owner', 'admin'].includes(profile.role)) return { error: 'Not authorised' }

  // Replace all department memberships in a transaction-like manner
  const { error: deleteError } = await admin.from('user_departments').delete().eq('user_id', userId)

  if (deleteError) return { error: deleteError.message }

  if (departmentIds.length > 0) {
    const { error: insertError } = await admin
      .from('user_departments')
      .insert(departmentIds.map((department_id) => ({ user_id: userId, department_id })))
    if (insertError) return { error: insertError.message }
  }

  return { error: null }
}

export async function revokeInviteAction(
  inviteId: string
): Promise<{ error: string } | { error: null }> {
  const { profile, admin } = await getActorProfile()

  if (!profile?.org_id) return { error: 'No organisation found' }
  if (!['owner', 'admin'].includes(profile.role)) return { error: 'Not authorised' }

  const { error } = await admin
    .from('invites')
    .delete()
    .eq('id', inviteId)
    .eq('org_id', profile.org_id)

  return { error: error?.message ?? null }
}

export async function removeUserAction(
  userId: string
): Promise<{ error: string } | { error: null }> {
  const { actorId, profile, admin } = await getActorProfile()

  if (!profile?.org_id) return { error: 'No organisation found' }
  if (!['owner', 'admin'].includes(profile.role)) return { error: 'Not authorised' }
  if (userId === actorId) return { error: 'You cannot remove yourself' }

  const { data: target } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .eq('org_id', profile.org_id)
    .single()

  if (!target) return { error: 'User not found' }
  if (target.role === 'owner') return { error: 'Cannot remove the org owner' }

  const { error } = await admin
    .from('profiles')
    .update({ invite_status: 'deactivated' })
    .eq('id', userId)
    .eq('org_id', profile.org_id)

  return { error: error?.message ?? null }
}
