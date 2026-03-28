import { describe, expect, it } from 'vitest'

import type { AssetWithRelations, ProfileWithDepartments } from '@/lib/types'
import {
  canEdit,
  canEditAsset,
  canManage,
  canViewAsset,
  canViewDepartment,
} from '@/lib/utils/permissions'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEPT_A = 'dept-aaaa-0000'
const DEPT_B = 'dept-bbbb-1111'

function makeUser(
  role: ProfileWithDepartments['role'],
  departmentIds: string[] = []
): ProfileWithDepartments {
  return {
    id: 'user-0001',
    orgId: 'org-0001',
    fullName: 'Test User',
    email: 'test@example.com',
    avatarUrl: null,
    role,
    inviteStatus: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    departmentIds,
    departmentNames: [],
  }
}

function makeAsset(departmentId: string | null = DEPT_A): AssetWithRelations {
  return {
    id: 'asset-0001',
    orgId: 'org-0001',
    assetTag: 'AST-00001',
    name: 'Test Laptop',
    isBulk: false,
    quantity: null,
    categoryId: null,
    departmentId,
    locationId: null,
    status: 'active',
    purchaseDate: null,
    purchaseCost: null,
    warrantyExpiry: null,
    vendorId: null,
    notes: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-0001',
    updatedBy: 'user-0001',
    categoryName: null,
    departmentName: null,
    locationName: null,
    vendorName: null,
    quantityCheckedOut: 0,
    currentAssignment: null,
    activeAssignments: [],
  }
}

// ---------------------------------------------------------------------------
// canManage
// ---------------------------------------------------------------------------

describe('canManage', () => {
  it('returns true for owner', () => {
    expect(canManage('owner')).toBe(true)
  })

  it('returns true for admin', () => {
    expect(canManage('admin')).toBe(true)
  })

  it('returns false for editor', () => {
    expect(canManage('editor')).toBe(false)
  })

  it('returns false for viewer', () => {
    expect(canManage('viewer')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canEdit
// ---------------------------------------------------------------------------

describe('canEdit', () => {
  it('returns true for owner', () => {
    expect(canEdit('owner')).toBe(true)
  })

  it('returns true for admin', () => {
    expect(canEdit('admin')).toBe(true)
  })

  it('returns true for editor', () => {
    expect(canEdit('editor')).toBe(true)
  })

  it('returns false for viewer', () => {
    expect(canEdit('viewer')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canViewDepartment
// ---------------------------------------------------------------------------

describe('canViewDepartment', () => {
  it('always grants access to owner', () => {
    expect(canViewDepartment(makeUser('owner'), DEPT_B)).toBe(true)
  })

  it('always grants access to admin', () => {
    expect(canViewDepartment(makeUser('admin'), DEPT_B)).toBe(true)
  })

  it('grants access to editor assigned to that department', () => {
    expect(canViewDepartment(makeUser('editor', [DEPT_A]), DEPT_A)).toBe(true)
  })

  it('denies access to editor not assigned to that department', () => {
    expect(canViewDepartment(makeUser('editor', [DEPT_B]), DEPT_A)).toBe(false)
  })

  it('grants access to viewer assigned to that department', () => {
    expect(canViewDepartment(makeUser('viewer', [DEPT_A]), DEPT_A)).toBe(true)
  })

  it('denies access to viewer not assigned to that department', () => {
    expect(canViewDepartment(makeUser('viewer', []), DEPT_A)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canEditAsset
// ---------------------------------------------------------------------------

describe('canEditAsset', () => {
  it('always grants edit to owner', () => {
    expect(canEditAsset(makeUser('owner'), makeAsset(DEPT_B))).toBe(true)
  })

  it('always grants edit to admin', () => {
    expect(canEditAsset(makeUser('admin'), makeAsset(DEPT_B))).toBe(true)
  })

  it('grants edit to editor in the same department', () => {
    expect(canEditAsset(makeUser('editor', [DEPT_A]), makeAsset(DEPT_A))).toBe(true)
  })

  it('denies edit to editor in a different department', () => {
    expect(canEditAsset(makeUser('editor', [DEPT_B]), makeAsset(DEPT_A))).toBe(false)
  })

  it('denies edit to editor when asset has no department', () => {
    expect(canEditAsset(makeUser('editor', [DEPT_A]), makeAsset(null))).toBe(false)
  })

  it('denies edit to viewer regardless of department', () => {
    expect(canEditAsset(makeUser('viewer', [DEPT_A]), makeAsset(DEPT_A))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canViewAsset
// ---------------------------------------------------------------------------

describe('canViewAsset', () => {
  it('always grants view to owner', () => {
    expect(canViewAsset(makeUser('owner'), makeAsset(DEPT_B))).toBe(true)
  })

  it('always grants view to admin', () => {
    expect(canViewAsset(makeUser('admin'), makeAsset(DEPT_B))).toBe(true)
  })

  it('grants view to user in the asset department', () => {
    expect(canViewAsset(makeUser('viewer', [DEPT_A]), makeAsset(DEPT_A))).toBe(true)
  })

  it('denies view to user not in the asset department', () => {
    expect(canViewAsset(makeUser('viewer', [DEPT_B]), makeAsset(DEPT_A))).toBe(false)
  })

  it('denies view when asset has no department and user is not owner/admin', () => {
    expect(canViewAsset(makeUser('viewer', [DEPT_A]), makeAsset(null))).toBe(false)
  })
})
