// ---------------------------------------------------------------------------
// Org-access resolution — ports
//
// A narrow, Supabase-like client port. The real `@supabase/ssr` client
// satisfies this structurally, so middleware passes it in directly; tests pass
// a call-counting spy. Keeping the surface tiny is what lets a single query
// stand in for the old slug -> org -> membership chain without leaking
// PostgREST types into the domain.
// ---------------------------------------------------------------------------

/** The one column resolution reads back: the org the membership belongs to. */
export type OrgAccessMembershipRow = { org_id: string }

export interface OrgAccessFilterBuilder {
  eq(column: string, value: string): OrgAccessFilterBuilder
  neq(column: string, value: string): OrgAccessFilterBuilder
  // Narrowed to the one field resolution reads. The live client also returns
  // `error`; resolution fails closed (deny) on a null row either way.
  maybeSingle(): PromiseLike<{ data: OrgAccessMembershipRow | null }>
}

export interface OrgAccessQueryBuilder {
  select(columns: string): OrgAccessFilterBuilder
}

export interface OrgAccessClient {
  from(relation: string): OrgAccessQueryBuilder
}

/** Resolved access for the org named by a route slug. */
export type OrgAccess = {
  /** True when the user holds an active membership in the org for this slug. */
  isMember: boolean
  /** The resolved org id when access is granted, else null. */
  orgId: string | null
}
