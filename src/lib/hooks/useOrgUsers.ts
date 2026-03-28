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
import type { Invite, ProfileWithDepartments, UserRole } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

export const orgUserKeys = {
  all: (orgId: string) => ['orgUsers', orgId] as const,
}

type Row = Record<string, unknown>
type UDRow = { department_id: string; departments: { id: string; name: string } | null }

async function fetchOrgUsers(
  orgId: string
): Promise<{ users: ProfileWithDepartments[]; pendingInvites: Invite[] }> {
  const supabase = createClient()
  const [profsResult, invsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, user_departments(department_id, departments(id, name))')
      .eq('org_id', orgId)
      .neq('invite_status', 'deactivated')
      .order('full_name'),
    supabase
      .from('invites')
      .select('*')
      .eq('org_id', orgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString()),
  ])
  if (profsResult.error) throw new Error(profsResult.error.message)
  if (invsResult.error) throw new Error(invsResult.error.message)

  const users = ((profsResult.data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    orgId: (r.org_id as string | null) ?? null,
    fullName: r.full_name as string,
    email: r.email as string,
    avatarUrl: (r.avatar_url as string | null) ?? null,
    role: r.role as ProfileWithDepartments['role'],
    inviteStatus: r.invite_status as ProfileWithDepartments['inviteStatus'],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    departmentIds: ((r.user_departments as UDRow[]) ?? []).map((ud) => ud.department_id),
    departmentNames: ((r.user_departments as UDRow[]) ?? []).map(
      (ud) => ud.departments?.name ?? ''
    ),
  }))

  const pendingInvites = ((invsResult.data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    orgId: r.org_id as string,
    email: r.email as string,
    role: r.role as Invite['role'],
    token: r.token as string,
    invitedBy: (r.invited_by as string) ?? '',
    invitedByName: r.invited_by_name as string,
    acceptedAt: null,
    expiresAt: r.expires_at as string,
    createdAt: r.created_at as string,
  }))

  return { users, pendingInvites }
}

export function useOrgUsers() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? ''
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
  }
}

export function useOrgUserMutations() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? ''
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
      const result = await sendInviteAction(email, role, departmentIds)
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
      const result = await revokeInviteAction(id)
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
      const result = await removeUserAction(id)
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
      const result = await updateUserRoleAction(id, role)
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
      const result = await updateUserDepartmentsAction(id, departmentIds)
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
