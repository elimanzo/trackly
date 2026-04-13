import { describe, expect, it } from 'vitest'

import { mapAssetRow } from '../useAssets'

// ---------------------------------------------------------------------------
// Minimal row factories
// ---------------------------------------------------------------------------

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'asset-1',
    org_id: 'org-1',
    asset_tag: 'AST-001',
    name: 'Test Asset',
    is_bulk: false,
    quantity: null,
    status: 'available',
    category_id: null,
    categories: null,
    department_id: null,
    departments: null,
    location_id: null,
    locations: null,
    vendor_id: null,
    vendors: null,
    purchase_date: null,
    purchase_cost: null,
    warranty_expiry: null,
    notes: null,
    deleted_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-1',
    updated_by: 'user-1',
    asset_assignments: [],
    ...overrides,
  }
}

function assignmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assign-1',
    assigned_to_user_id: 'user-2',
    assigned_to_name: 'Alice',
    assigned_by: 'user-1',
    assigned_by_name: 'Admin',
    assigned_at: '2024-01-10T00:00:00Z',
    expected_return_at: null,
    returned_at: null,
    notes: null,
    quantity: 1,
    department_id: null,
    departments: null,
    location_id: null,
    locations: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Serialized asset ui
// ---------------------------------------------------------------------------

describe('mapAssetRow — serialized asset ui', () => {
  it('statusBadgeText is null', () => {
    const asset = mapAssetRow(baseRow({ is_bulk: false, quantity: null, status: 'active' }))
    expect(asset.ui.statusBadgeText).toBeNull()
  })

  it('checkoutLabel is "asset"', () => {
    const asset = mapAssetRow(baseRow({ is_bulk: false, quantity: null, status: 'active' }))
    expect(asset.ui.checkoutLabel).toBe('asset')
  })

  it('checkoutSubtitle includes the asset tag', () => {
    const asset = mapAssetRow(
      baseRow({ is_bulk: false, quantity: null, status: 'active', asset_tag: 'AST-042' })
    )
    expect(asset.ui.checkoutSubtitle).toBe('— AST-042')
  })

  it('availableQty is null', () => {
    const asset = mapAssetRow(baseRow({ is_bulk: false, quantity: null, status: 'active' }))
    expect(asset.ui.availableQty).toBeNull()
  })

  it('assignmentTabLabel is "Assignment"', () => {
    const asset = mapAssetRow(baseRow({ is_bulk: false, quantity: null, status: 'active' }))
    expect(asset.ui.assignmentTabLabel).toBe('Assignment')
  })

  it('secondaryAction is "return" when status is checked_out', () => {
    const asset = mapAssetRow(
      baseRow({
        is_bulk: false,
        quantity: null,
        status: 'checked_out',
        asset_assignments: [assignmentRow()],
      })
    )
    expect(asset.ui.secondaryAction).toBe('return')
  })

  it('secondaryAction is null when status is active', () => {
    const asset = mapAssetRow(baseRow({ is_bulk: false, quantity: null, status: 'active' }))
    expect(asset.ui.secondaryAction).toBeNull()
  })

  it('assignments is empty when no active assignments', () => {
    const asset = mapAssetRow(baseRow({ is_bulk: false, quantity: null, status: 'active' }))
    expect(asset.ui.assignments).toEqual([])
  })

  it('assignments contains the current assignment when checked out', () => {
    const asset = mapAssetRow(
      baseRow({
        is_bulk: false,
        quantity: null,
        status: 'checked_out',
        asset_assignments: [assignmentRow()],
      })
    )
    expect(asset.ui.assignments).toHaveLength(1)
    expect(asset.ui.assignments[0]!.assignedToName).toBe('Alice')
  })
})

// ---------------------------------------------------------------------------
// Bulk asset ui
// ---------------------------------------------------------------------------

describe('mapAssetRow — bulk asset ui', () => {
  it('statusBadgeText shows available/total', () => {
    const asset = mapAssetRow(baseRow({ is_bulk: true, quantity: 10, status: 'active' }))
    expect(asset.ui.statusBadgeText).toBe('10/10 avail.')
  })

  it('statusBadgeText reflects checked-out units', () => {
    const asset = mapAssetRow(
      baseRow({
        is_bulk: true,
        quantity: 10,
        status: 'active',
        asset_assignments: [assignmentRow({ quantity: 3 })],
      })
    )
    expect(asset.ui.statusBadgeText).toBe('7/10 avail.')
  })

  it('checkoutLabel is "items"', () => {
    const asset = mapAssetRow(baseRow({ is_bulk: true, quantity: 5, status: 'active' }))
    expect(asset.ui.checkoutLabel).toBe('items')
  })

  it('checkoutSubtitle shows available count', () => {
    const asset = mapAssetRow(
      baseRow({
        is_bulk: true,
        quantity: 10,
        status: 'active',
        asset_assignments: [assignmentRow({ quantity: 4 })],
      })
    )
    expect(asset.ui.checkoutSubtitle).toBe('— 6 available')
  })

  it('availableQty matches available units', () => {
    const asset = mapAssetRow(
      baseRow({
        is_bulk: true,
        quantity: 10,
        status: 'active',
        asset_assignments: [assignmentRow({ quantity: 3 })],
      })
    )
    expect(asset.ui.availableQty).toBe(7)
  })

  it('assignmentTabLabel shows count of active assignments', () => {
    const asset = mapAssetRow(
      baseRow({
        is_bulk: true,
        quantity: 10,
        status: 'active',
        asset_assignments: [
          assignmentRow(),
          assignmentRow({ id: 'assign-2', assigned_to_name: 'Bob' }),
        ],
      })
    )
    expect(asset.ui.assignmentTabLabel).toBe('Checked out (2)')
  })

  it('assignmentTabLabel shows 0 when nothing checked out', () => {
    const asset = mapAssetRow(baseRow({ is_bulk: true, quantity: 5, status: 'active' }))
    expect(asset.ui.assignmentTabLabel).toBe('Checked out (0)')
  })

  it('secondaryAction is "restock"', () => {
    const asset = mapAssetRow(baseRow({ is_bulk: true, quantity: 5, status: 'active' }))
    expect(asset.ui.secondaryAction).toBe('restock')
  })

  it('assignments contains all active assignments', () => {
    const asset = mapAssetRow(
      baseRow({
        is_bulk: true,
        quantity: 10,
        status: 'active',
        asset_assignments: [
          assignmentRow(),
          assignmentRow({ id: 'assign-2', assigned_to_name: 'Bob', quantity: 2 }),
        ],
      })
    )
    expect(asset.ui.assignments).toHaveLength(2)
  })

  it('returned assignments are excluded from ui.assignments', () => {
    const asset = mapAssetRow(
      baseRow({
        is_bulk: true,
        quantity: 10,
        status: 'active',
        asset_assignments: [
          assignmentRow({ returned_at: '2024-02-01T00:00:00Z' }),
          assignmentRow({ id: 'assign-2', assigned_to_name: 'Bob' }),
        ],
      })
    )
    expect(asset.ui.assignments).toHaveLength(1)
    expect(asset.ui.assignments[0]!.assignedToName).toBe('Bob')
  })
})
