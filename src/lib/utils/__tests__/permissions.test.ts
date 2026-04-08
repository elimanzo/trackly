import { describe, expect, it } from 'vitest'

import { createPolicy, type PermissionPrincipal } from '@/lib/permissions'
import type { SerializedAsset } from '@/lib/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEPT_A = 'dept-aaaa-0000'
const DEPT_B = 'dept-bbbb-1111'

function makeUser(
  role: PermissionPrincipal['role'],
  departmentIds: string[] = []
): PermissionPrincipal {
  return { role, departmentIds }
}

function makeAsset(departmentId: string | null = DEPT_A): SerializedAsset {
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
    currentAssignment: null,
    assigneeSummary: null,
    statusLabel: 'Active',
    isAvailable: true,
    isCheckedOut: false,
    ui: {
      statusBadgeText: null,
      checkoutLabel: 'asset' as const,
      checkoutSubtitle: '— AST-00001',
      availableQty: null,
      assignmentTabLabel: 'Assignment',
      secondaryAction: null,
      assignments: [],
    },
  }
}

// ---------------------------------------------------------------------------
// canManage equivalent — can('department:manage')
// ---------------------------------------------------------------------------

describe('can department:manage (admin-tier check)', () => {
  it('returns true for owner', () => {
    expect(createPolicy(makeUser('owner')).can('department:manage')).toBe(true)
  })

  it('returns true for admin', () => {
    expect(createPolicy(makeUser('admin')).can('department:manage')).toBe(true)
  })

  it('returns false for editor', () => {
    expect(createPolicy(makeUser('editor')).can('department:manage')).toBe(false)
  })

  it('returns false for viewer', () => {
    expect(createPolicy(makeUser('viewer')).can('department:manage')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canEdit equivalent — can('asset:create') coarse role-tier check
// ---------------------------------------------------------------------------

describe('can asset:create (editor-tier check, no resource)', () => {
  it('returns true for owner', () => {
    expect(createPolicy(makeUser('owner')).can('asset:create')).toBe(true)
  })

  it('returns true for admin', () => {
    expect(createPolicy(makeUser('admin')).can('asset:create')).toBe(true)
  })

  it('returns true for editor', () => {
    expect(createPolicy(makeUser('editor')).can('asset:create')).toBe(true)
  })

  it('returns false for viewer', () => {
    expect(createPolicy(makeUser('viewer')).can('asset:create')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canEditInDepartment equivalent — can('asset:update', { departmentId })
// ---------------------------------------------------------------------------

describe('can asset:update (dept-scoped)', () => {
  it('allows owner regardless of department', () => {
    expect(createPolicy(makeUser('owner')).can('asset:update', { departmentId: null })).toBe(true)
    expect(createPolicy(makeUser('owner')).can('asset:update', { departmentId: DEPT_A })).toBe(true)
  })

  it('allows admin regardless of department', () => {
    expect(createPolicy(makeUser('admin')).can('asset:update', { departmentId: null })).toBe(true)
    expect(createPolicy(makeUser('admin')).can('asset:update', { departmentId: DEPT_A })).toBe(true)
  })

  it('allows editor in their assigned department', () => {
    expect(
      createPolicy(makeUser('editor', [DEPT_A])).can('asset:update', { departmentId: DEPT_A })
    ).toBe(true)
  })

  it('denies editor in a different department', () => {
    expect(
      createPolicy(makeUser('editor', [DEPT_B])).can('asset:update', { departmentId: DEPT_A })
    ).toBe(false)
  })

  it('denies editor when asset has no department', () => {
    expect(
      createPolicy(makeUser('editor', [DEPT_A])).can('asset:update', { departmentId: null })
    ).toBe(false)
  })

  it('denies viewer regardless of department', () => {
    expect(
      createPolicy(makeUser('viewer', [DEPT_A])).can('asset:update', { departmentId: DEPT_A })
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canEditAsset equivalent — can('asset:update', { departmentId: asset.departmentId })
// ---------------------------------------------------------------------------

describe('can asset:update for a specific asset', () => {
  it('always allows owner', () => {
    expect(
      createPolicy(makeUser('owner')).can('asset:update', {
        departmentId: makeAsset(DEPT_B).departmentId,
      })
    ).toBe(true)
  })

  it('always allows admin', () => {
    expect(
      createPolicy(makeUser('admin')).can('asset:update', {
        departmentId: makeAsset(DEPT_B).departmentId,
      })
    ).toBe(true)
  })

  it('allows editor in the same department', () => {
    expect(
      createPolicy(makeUser('editor', [DEPT_A])).can('asset:update', {
        departmentId: makeAsset(DEPT_A).departmentId,
      })
    ).toBe(true)
  })

  it('denies editor in a different department', () => {
    expect(
      createPolicy(makeUser('editor', [DEPT_B])).can('asset:update', {
        departmentId: makeAsset(DEPT_A).departmentId,
      })
    ).toBe(false)
  })

  it('denies editor when asset has no department', () => {
    expect(
      createPolicy(makeUser('editor', [DEPT_A])).can('asset:update', {
        departmentId: makeAsset(null).departmentId,
      })
    ).toBe(false)
  })

  it('denies viewer regardless of department', () => {
    expect(
      createPolicy(makeUser('viewer', [DEPT_A])).can('asset:update', {
        departmentId: makeAsset(DEPT_A).departmentId,
      })
    ).toBe(false)
  })
})
