import type { OrgMembership, Profile } from '@/lib/types'

import type {
  DepartmentRow,
  MembershipRow,
  ProfileRow,
  StartupClient,
  StartupContext,
  StartupDepartment,
} from './ports'

export async function loadStartupContext(
  client: StartupClient,
  userId: string
): Promise<StartupContext> {
  // departments depends only on memberships (for the org ids), so it chains off
  // that read alone — profile stays fully parallel and off its critical path.
  const membershipsPromise = loadMemberships(client, userId)

  const [profile, memberships, departments] = await Promise.all([
    loadProfile(client, userId),
    membershipsPromise,
    membershipsPromise.then((rows) => {
      const orgIds = rows.map((m) => m.orgId)
      return orgIds.length > 0 ? loadDepartments(client, userId, orgIds) : []
    }),
  ])

  return { profile, memberships, departments }
}

async function loadProfile(client: StartupClient, userId: string): Promise<Profile | null> {
  const { data } = await client
    .from<ProfileRow>('profiles')
    .select('id, full_name, email, avatar_url, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    avatarUrl: data.avatar_url ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

async function loadMemberships(client: StartupClient, userId: string): Promise<OrgMembership[]> {
  const { data } = await client
    .from<MembershipRow>('user_org_memberships')
    .select('org_id, role, invite_status, created_at, organizations ( slug, name )')
    .eq('user_id', userId)

  return (data ?? []).map((m) => ({
    userId,
    orgId: m.org_id,
    orgSlug: m.organizations?.slug ?? '',
    orgName: m.organizations?.name ?? '',
    role: m.role as OrgMembership['role'],
    inviteStatus: m.invite_status as OrgMembership['inviteStatus'],
    createdAt: m.created_at,
  }))
}

async function loadDepartments(
  client: StartupClient,
  userId: string,
  orgIds: string[]
): Promise<StartupDepartment[]> {
  const { data } = await client
    .from<DepartmentRow>('user_departments')
    .select('org_id, department_id, departments ( name )')
    .eq('user_id', userId)
    .in('org_id', orgIds)

  return (data ?? []).map((d) => ({
    orgId: d.org_id,
    departmentId: d.department_id,
    name: d.departments?.name ?? '',
  }))
}
