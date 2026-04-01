import type { DepartmentConstraint } from './policy'

// Supabase's .in(col, []) returns all rows instead of none, so we use an
// impossible UUID to force a zero-result query when an editor has no departments.
const IMPOSSIBLE_UUID = '00000000-0000-0000-0000-000000000000'

type FilterableQuery = {
  in(column: string, values: string[]): FilterableQuery
  eq(column: string, value: string): FilterableQuery
}

export function applyDepartmentConstraint<Q extends FilterableQuery>(
  query: Q,
  constraint: DepartmentConstraint
): Q {
  if (constraint.kind === 'in') return query.in('department_id', constraint.ids) as Q
  if (constraint.kind === 'none') return query.eq('department_id', IMPOSSIBLE_UUID) as Q
  return query // 'all' — owner/admin, no filter needed
}
