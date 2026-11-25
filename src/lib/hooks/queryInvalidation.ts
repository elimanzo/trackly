import type { QueryClient } from '@tanstack/react-query'

/**
 * Every DB table the app subscribes to or mutates.
 * Used as the key into the dependency graph below.
 */
export type AppTable =
  | 'assets'
  | 'asset_assignments'
  | 'audit_logs'
  | 'categories'
  | 'departments'
  | 'locations'
  | 'vendors'
  | 'profiles'
  | 'invites'
  | 'user_departments'
  | 'user_org_memberships'

// ---------------------------------------------------------------------------
// Dependency graph
// ---------------------------------------------------------------------------
//
// Single source of truth: "when table X changes, bust these query key prefixes."
// React Query prefix-matches arrays, so ['assets'] invalidates every
// ['assets', orgId, role, ...filters] variant without knowing the full key.
//
// orgId-scoped entries (e.g. ['dashboardStats', orgId]) target only the current
// org's cache, which matters in multi-tab sessions after an org switch.

type Keys = (orgId: string) => ReadonlyArray<readonly unknown[]>

const TABLE_DEPS: Record<AppTable, Keys> = {
  // Asset mutations — bust list, single, and dashboard
  assets: (orgId) => [['assets'], ['asset'], ['dashboardStats', orgId]],

  // Assignment changes affect checked-out state and assigneeSummary on asset rows
  asset_assignments: (orgId) => [['assets'], ['asset'], ['dashboardStats', orgId]],

  // Reference-data tables: a rename or delete leaves stale denormalized names
  // in every cached asset row that joined that entity.
  // FIX: locations and vendors were previously missing ['assets'] invalidation.
  categories: (orgId) => [['categories', orgId], ['assets'], ['asset'], ['dashboardStats', orgId]],
  departments: (orgId) => [
    ['departments', orgId],
    ['assets'],
    ['asset'],
    ['dashboardStats', orgId],
  ],
  locations: (orgId) => [['locations', orgId], ['assets'], ['asset'], ['dashboardStats', orgId]],
  vendors: (orgId) => [['vendors', orgId], ['assets'], ['asset'], ['dashboardStats', orgId]],

  // Audit log writes: feed, per-asset history, and 7-day activity count on dashboard.
  // FIX: was previously ['recentActivity'] (bare prefix) — now scoped to orgId.
  // ['assetHistory'] stays as a bare prefix: realtime events don't carry assetId,
  // so we can't narrow to a specific history query.
  audit_logs: (orgId) => [['recentActivity', orgId], ['assetHistory'], ['dashboardStats', orgId]],

  // User / invite tables — affect the org users list. The three that feed the
  // cached shell context (profile, memberships, departments) also bust it, so a
  // membership/role/department change is reflected without a full reload.
  // ['startupContext'] is a bare prefix: the shell key carries userId, which
  // these org-scoped realtime events don't, and only one user's shell is ever
  // cached per browser session.
  profiles: (orgId) => [['orgUsers', orgId], ['startupContext']],
  invites: (orgId) => [['orgUsers', orgId]],
  user_departments: (orgId) => [['orgUsers', orgId], ['startupContext']],
  user_org_memberships: (orgId) => [['orgUsers', orgId], ['startupContext']],
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Invalidate every query key that depends on a table change.
 *
 * @example
 *   // In OrgRealtimeSync:
 *   .on('postgres_changes', filter('locations'), () =>
 *     invalidateForTable(queryClient, orgId, 'locations')
 *   )
 *
 *   // In makeEntityHooks onDeleteSuccess:
 *   onDeleteSuccess: (queryClient, orgId) =>
 *     invalidateForTable(queryClient, orgId, 'categories')
 */
export function invalidateForTable(queryClient: QueryClient, orgId: string, table: AppTable): void {
  for (const queryKey of TABLE_DEPS[table](orgId)) {
    void queryClient.invalidateQueries({ queryKey })
  }
}
