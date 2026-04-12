import type { UserRole } from '@/lib/types'

export type PolicyAction =
  | 'asset:create'
  | 'asset:update'
  | 'asset:delete'
  | 'asset:checkout'
  | 'asset:return'
  | 'asset:restock'
  | 'assignment:update'
  | 'department:manage'
  | 'user:manage'
  | 'org:manage'

export type DepartmentConstraint =
  | { kind: 'all' }
  | { kind: 'in'; ids: string[] }
  | { kind: 'none' }

export type PermissionPrincipal = {
  role: UserRole
  departmentIds: string[]
}

/**
 * Optional resource context for permission checks.
 * Extensible: add fields here (e.g. orgId for multi-org) without breaking callsites.
 */
export type ResourceContext = {
  departmentId?: string | null
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: UserRole[] = ['viewer', 'editor', 'admin', 'owner']

const ACTION_RULES: Record<
  PolicyAction,
  { minRole: 'editor' | 'admin' | 'owner'; deptScoped: boolean }
> = {
  'asset:create': { minRole: 'editor', deptScoped: true },
  'asset:update': { minRole: 'editor', deptScoped: true },
  'asset:delete': { minRole: 'editor', deptScoped: true },
  'asset:checkout': { minRole: 'editor', deptScoped: true },
  'asset:return': { minRole: 'editor', deptScoped: true },
  'asset:restock': { minRole: 'editor', deptScoped: true },
  'assignment:update': { minRole: 'editor', deptScoped: true },
  'department:manage': { minRole: 'admin', deptScoped: false },
  'user:manage': { minRole: 'admin', deptScoped: false },
  'org:manage': { minRole: 'owner', deptScoped: false },
}

function meetsMinRole(role: UserRole, minRole: 'editor' | 'admin' | 'owner'): boolean {
  return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minRole)
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPolicy(principal: PermissionPrincipal) {
  const { role, departmentIds } = principal

  function canDo(action: PolicyAction, resource?: ResourceContext): boolean {
    const rule = ACTION_RULES[action]
    if (!meetsMinRole(role, rule.minRole)) return false
    // Dept-scoped check is only applied when a resource is explicitly provided.
    // Omitting resource gives a coarse role-tier result, useful for UI visibility gates.
    if (resource !== undefined && rule.deptScoped && role !== 'owner' && role !== 'admin') {
      if (!resource.departmentId || !departmentIds.includes(resource.departmentId)) {
        return false
      }
    }
    return true
  }

  return {
    /**
     * Boolean check — use in UI components to conditionally render controls.
     *
     * @example
     *   if (policy.can('asset:update', { departmentId: asset.departmentId })) …
     */
    can: canDo,

    /**
     * Gate check for a single operation. Returns null on success or
     * { error } on denial — same shape as every server action return type.
     *
     * @example
     *   const denied = policy.enforce('asset:update', { departmentId: asset.departmentId })
     *   if (denied) return denied
     */
    enforce(action: PolicyAction, resource?: ResourceContext): { error: string } | null {
      return canDo(action, resource) ? null : { error: 'Not authorised' }
    },

    /**
     * Returns the constraint that must be applied to any asset collection query.
     * Pass the result to applyDepartmentConstraint() from @/lib/permissions/supabase.
     */
    queryConstraint(): DepartmentConstraint {
      if (role === 'owner' || role === 'admin') return { kind: 'all' }
      if (departmentIds.length > 0) return { kind: 'in', ids: departmentIds }
      return { kind: 'none' }
    },
  }
}
