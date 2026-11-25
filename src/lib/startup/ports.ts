import type { OrgMembership, Profile } from '@/lib/types'

export type ProfileRow = {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type MembershipRow = {
  org_id: string
  role: string
  invite_status: string
  created_at: string
  organizations: { slug: string; name: string } | null
}

export type DepartmentRow = {
  org_id: string
  department_id: string
  departments: { name: string } | null
}

export type StartupDepartment = {
  orgId: string
  departmentId: string
  name: string
}

export type StartupContext = {
  profile: Profile | null
  memberships: OrgMembership[]
  departments: StartupDepartment[]
}

export interface StartupQueryBuilder<Row> extends PromiseLike<{ data: Row[] | null }> {
  select(columns: string): StartupQueryBuilder<Row>
  eq(column: string, value: string): StartupQueryBuilder<Row>
  in(column: string, values: string[]): StartupQueryBuilder<Row>
  maybeSingle(): PromiseLike<{ data: Row | null }>
}

export interface StartupClient {
  from<Row = Record<string, unknown>>(relation: string): StartupQueryBuilder<Row>
}
