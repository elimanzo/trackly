import { describe, expect, it, vi } from 'vitest'

import { invalidateForTable } from '../queryInvalidation'

const ORG = 'org-0001'

function makeClient() {
  const calls: readonly unknown[][] = []
  return {
    invalidateQueries: vi.fn(({ queryKey }: { queryKey: readonly unknown[] }) => {
      ;(calls as unknown as (readonly unknown[])[]).push(queryKey)
      return Promise.resolve()
    }),
    _calls: calls,
  }
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

describe('assets table', () => {
  it('invalidates list, single, and dashboard', () => {
    const qc = makeClient()
    invalidateForTable(qc as never, ORG, 'assets')
    expect(qc._calls).toContainEqual(['assets'])
    expect(qc._calls).toContainEqual(['asset'])
    expect(qc._calls).toContainEqual(['dashboardStats', ORG])
  })
})

describe('asset_assignments table', () => {
  it('invalidates list, single, and dashboard', () => {
    const qc = makeClient()
    invalidateForTable(qc as never, ORG, 'asset_assignments')
    expect(qc._calls).toContainEqual(['assets'])
    expect(qc._calls).toContainEqual(['asset'])
    expect(qc._calls).toContainEqual(['dashboardStats', ORG])
  })
})

// ---------------------------------------------------------------------------
// Reference-data tables (categories, departments, locations, vendors)
// ---------------------------------------------------------------------------

describe.each(['categories', 'departments', 'locations', 'vendors'] as const)(
  '%s table',
  (table) => {
    it('invalidates its own list key', () => {
      const qc = makeClient()
      invalidateForTable(qc as never, ORG, table)
      expect(qc._calls).toContainEqual([table, ORG])
    })

    it('invalidates asset list and single (denormalized names)', () => {
      const qc = makeClient()
      invalidateForTable(qc as never, ORG, table)
      expect(qc._calls).toContainEqual(['assets'])
      expect(qc._calls).toContainEqual(['asset'])
    })

    it('invalidates dashboard (breakdown stats)', () => {
      const qc = makeClient()
      invalidateForTable(qc as never, ORG, table)
      expect(qc._calls).toContainEqual(['dashboardStats', ORG])
    })
  }
)

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

describe('audit_logs table', () => {
  it('invalidates recentActivity scoped to orgId (not bare prefix)', () => {
    const qc = makeClient()
    invalidateForTable(qc as never, ORG, 'audit_logs')
    expect(qc._calls).toContainEqual(['recentActivity', ORG])
    expect(qc._calls).not.toContainEqual(['recentActivity']) // bare prefix is wrong
  })

  it('invalidates assetHistory (prefix — no assetId available from table event)', () => {
    const qc = makeClient()
    invalidateForTable(qc as never, ORG, 'audit_logs')
    expect(qc._calls).toContainEqual(['assetHistory'])
  })

  it('invalidates dashboard (7-day activity count)', () => {
    const qc = makeClient()
    invalidateForTable(qc as never, ORG, 'audit_logs')
    expect(qc._calls).toContainEqual(['dashboardStats', ORG])
  })
})

// ---------------------------------------------------------------------------
// User/invite tables
// ---------------------------------------------------------------------------

describe.each(['profiles', 'invites', 'user_departments'] as const)('%s table', (table) => {
  it('invalidates orgUsers scoped to orgId', () => {
    const qc = makeClient()
    invalidateForTable(qc as never, ORG, table)
    expect(qc._calls).toContainEqual(['orgUsers', ORG])
  })

  it('does not invalidate assets', () => {
    const qc = makeClient()
    invalidateForTable(qc as never, ORG, table)
    expect(qc._calls).not.toContainEqual(['assets'])
  })
})

// ---------------------------------------------------------------------------
// Cross-org isolation
// ---------------------------------------------------------------------------

describe('orgId scoping', () => {
  it('uses the provided orgId, not a neighbour org', () => {
    const qc = makeClient()
    invalidateForTable(qc as never, 'org-A', 'categories')
    expect(qc._calls).toContainEqual(['categories', 'org-A'])
    expect(qc._calls).not.toContainEqual(['categories', 'org-B'])
  })
})
