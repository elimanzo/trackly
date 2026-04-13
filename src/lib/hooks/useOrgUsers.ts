import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { sendInviteAction } from '@/app/actions/invites'
import {
  removeUserAction,
  revokeInviteAction,
  updateUserDepartmentsAction,
  updateUserRoleAction,
} from '@/app/actions/users'
import { createClient } from '@/lib/supabase/client'
import type { Invite, OrgMember, UserRole } from '@/lib/types'
import { useOrg } from '@/providers/OrgProvider'

export const orgUserKeys = {
  all: (orgId: string) => ['orgUsers', orgId] as const,
}

type MembershipRow = {
  user_id: string
  org_id: string
  role: string
  invite_status: string
  profiles: {
    full_name: string
    email: string
    avatar_url: string | null
    created_at: string
    updated_at: string
  } | null
}

type UDRow = {
  user_id: string
  department_id: string
  departments: { id: string; name: string } | null
}

type InvRow = {
  id: string
  org_id: string
  email: string
  role: string
  token: string
  invited_by: string | null
  invited_by_name: string
  accepted_at: string | null
  expires_at: string
  created_at: string
}

async function fetchOrgUsers(
  orgId: string
): Promise<{ users: OrgMember[]; pendingInvites: Invite[] }> {
  const supabase = createClient()
  const [membershipsResult, deptsResult, invsResult] = await Promise.all([
    supabase
      .from('user_org_memberships')
      .select(
        'user_id, org_id, role, invite_status, profiles(full_name, email, avatar_url, created_at, updated_at)'
      )
      .eq('org_id', orgId)
      .neq('invite_status', 'deactivated')
      .order('user_id'),
    supabase
      .from('user_departments')
      .select('user_id, department_id, departments(id, name)')
      .eq('org_id', orgId),
    supabase
      .from('invites')
      .select('*')
      .eq('org_id', orgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()),
  ])
  if (membershipsResult.error) throw new Error(membershipsResult.error.message)
  if (deptsResult.error) throw new Error(deptsResult.error.message)
  if (invsResult.error) throw new Error(invsResult.error.message)

  const deptsByUser = new Map<string, UDRow[]>()
  for (const ud of deptsResult.data as UDRow[]) {
    const arr = deptsByUser.get(ud.user_id) ?? []
    arr.push(ud)
    deptsByUser.set(ud.user_id, arr)
  }

  const users = (membershipsResult.data as MembershipRow[]).map((m) => {
    const p = m.profiles
    const depts = deptsByUser.get(m.user_id) ?? []
    return {
      id: m.user_id,
      orgId: m.org_id,
      fullName: p?.full_name ?? '',
      email: p?.email ?? '',
      avatarUrl: p?.avatar_url ?? null,
      role: m.role as OrgMember['role'],
      inviteStatus: m.invite_status as OrgMember['inviteStatus'],
      createdAt: p?.created_at ?? '',
      updatedAt: p?.updated_at ?? '',
      departmentIds: depts.map((ud) => ud.department_id),
      departmentNames: depts.map((ud) => ud.departments?.name ?? ''),
    }
  })

  const pendingInvites = (invsResult.data as InvRow[]).map((r) => ({
    id: r.id,
    orgId: r.org_id,
    email: r.email,
    role: r.role as Invite['role'],
    token: r.token,
    invitedBy: r.invited_by ?? '',
    invitedByName: r.invited_by_name,
    acceptedAt: null,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }))

  return { users, pendingInvites }
}

export function useOrgUsers() {
  const { org } = useOrg()
  const orgId = org?.id ?? ''
  const query = useQuery({
    queryKey: orgUserKeys.all(orgId),
    queryFn: () => fetchOrgUsers(orgId),
    enabled: Boolean(orgId),
    staleTime: 30_000,
  })
  return {
    users: query.data?.users ?? [],
    pendingInvites: query.data?.pendingInvites ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

export function useOrgUserMutations() {
  const { org, membership } = useOrg()
  const orgId = org?.id ?? ''
  const orgSlug = membership?.orgSlug ?? ''
  const queryClient = useQueryClient()
  const invalidate = () => {
    if (orgId) void queryClient.invalidateQueries({ queryKey: orgUserKeys.all(orgId) })
  }

  const sendInviteMut = useMutation({
    mutationFn: async ({
      email,
      role,
      departmentIds,
    }: {
      email: string
      role: Invite['role']
      departmentIds: string[]
    }) => {
      const result = await sendInviteAction(orgSlug, email, role, departmentIds)
      if (result?.error) throw new Error(result.error)
      return email
    },
    onSuccess: (email) => {
      toast.success(`Invite sent to ${email}`)
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const revokeInviteMut = useMutation({
    mutationFn: async (id: string) => {
      const result = await revokeInviteAction(orgSlug, id)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Invite revoked')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeUserMut = useMutation({
    mutationFn: async (id: string) => {
      const result = await removeUserAction(orgSlug, id)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('User removed')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateRoleMut = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Exclude<UserRole, 'owner'> }) => {
      const result = await updateUserRoleAction(orgSlug, id, role)
      if (result?.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Role updated')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateDeptsMut = useMutation({
    mutationFn: async ({ id, departmentIds }: { id: string; departmentIds: string[] }) => {
      const result = await updateUserDepartmentsAction(orgSlug, id, departmentIds)
      if (result?.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Departments updated')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    sendInvite: (email: string, role: Invite['role'], departmentIds: string[] = []) =>
      sendInviteMut.mutate({ email, role, departmentIds }),
    revokeInvite: (id: string) => revokeInviteMut.mutate(id),
    removeUser: (id: string) => removeUserMut.mutate(id),
    updateUserRole: async (id: string, role: Exclude<UserRole, 'owner'>) => {
      await updateRoleMut.mutateAsync({ id, role }).catch(() => {})
    },
    updateUserDepartments: async (id: string, departmentIds: string[]) => {
      await updateDeptsMut.mutateAsync({ id, departmentIds }).catch(() => {})
    },
  }
}
