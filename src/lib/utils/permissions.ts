import type { AssetWithRelations, ProfileWithDepartments, UserRole } from '@/lib/types'

/** Admin-level: can create/manage departments, categories, users, etc. */
export function canManage(role: UserRole): boolean {
  return role === 'owner' || role === 'admin'
}

/** Editor-level: can create/edit/delete assets in their departments */
export function canEdit(role: UserRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

/** Whether the user can view assets in a given department */
export function canViewDepartment(user: ProfileWithDepartments, departmentId: string): boolean {
  if (canManage(user.role)) return true
  return user.departmentIds.includes(departmentId)
}

/**
 * Core department-level edit check: can this role/dept-list edit an asset in a given department?
 * Single source of truth shared by both the server-side requireCanEdit and the client-side canEditAsset.
 */
export function canEditInDepartment(
  role: UserRole,
  departmentIds: string[],
  assetDepartmentId: string | null
): boolean {
  if (role === 'owner' || role === 'admin') return true
  if (role === 'editor' && assetDepartmentId) return departmentIds.includes(assetDepartmentId)
  return false
}

/** Whether the user can edit/delete a specific asset */
export function canEditAsset(user: ProfileWithDepartments, asset: AssetWithRelations): boolean {
  return canEditInDepartment(user.role, user.departmentIds, asset.departmentId ?? null)
}

/** Whether the user can see the asset (viewer or above in same dept) */
export function canViewAsset(user: ProfileWithDepartments, asset: AssetWithRelations): boolean {
  if (canManage(user.role)) return true
  if (asset.departmentId) return user.departmentIds.includes(asset.departmentId)
  return false
}
