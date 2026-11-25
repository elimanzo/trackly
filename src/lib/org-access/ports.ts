export type OrgAccessMembershipRow = { org_id: string }

export interface OrgAccessFilterBuilder {
  eq(column: string, value: string): OrgAccessFilterBuilder
  neq(column: string, value: string): OrgAccessFilterBuilder
  maybeSingle(): PromiseLike<{ data: OrgAccessMembershipRow | null }>
}

export interface OrgAccessQueryBuilder {
  select(columns: string): OrgAccessFilterBuilder
}

export interface OrgAccessClient {
  from(relation: string): OrgAccessQueryBuilder
}

export type OrgAccess = {
  isMember: boolean
  orgId: string | null
}
