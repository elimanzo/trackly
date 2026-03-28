// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AssetWithRelations } from '@/lib/types'
import { exportAssetsToCsv, type ReportColumn } from '@/lib/utils/csv-export'

// ---------------------------------------------------------------------------
// Capture Blob content written by exportAssetsToCsv
// ---------------------------------------------------------------------------

let capturedCsv = ''

beforeEach(() => {
  capturedCsv = ''

  // Intercept Blob construction to extract CSV text
  global.Blob = class MockBlob {
    constructor(parts: BlobPart[]) {
      capturedCsv = (parts as string[]).join('')
    }
  } as unknown as typeof Blob

  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
  global.URL.revokeObjectURL = vi.fn()

  // Prevent jsdom from complaining about missing href click behaviour
  const mockLink = { href: '', download: '', click: vi.fn() }
  vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAsset(overrides: Partial<AssetWithRelations> = {}): AssetWithRelations {
  return {
    id: 'asset-0001',
    orgId: 'org-0001',
    assetTag: 'AST-00001',
    name: 'Laptop',
    isBulk: false,
    quantity: null,
    categoryId: null,
    departmentId: null,
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
    departmentName: 'Engineering',
    locationName: null,
    vendorName: null,
    quantityCheckedOut: 0,
    currentAssignment: null,
    activeAssignments: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// CSV structure
// ---------------------------------------------------------------------------

describe('exportAssetsToCsv', () => {
  it('includes Asset Tag and Name as the first two headers', () => {
    exportAssetsToCsv([makeAsset()])
    const headers = capturedCsv.split('\n')[0]
    expect(headers).toMatch(/^Asset Tag,Name/)
  })

  it('writes one data row per asset', () => {
    exportAssetsToCsv([makeAsset(), makeAsset({ assetTag: 'AST-00002', name: 'Monitor' })])
    const lines = capturedCsv.split('\n')
    // header + 2 rows
    expect(lines).toHaveLength(3)
  })

  it('places asset tag and name in the first two columns', () => {
    exportAssetsToCsv([makeAsset()])
    const dataRow = capturedCsv.split('\n')[1]
    expect(dataRow).toMatch(/^AST-00001,Laptop/)
  })

  // ---------------------------------------------------------------------------
  // CSV escaping (tested through the exported function)
  // ---------------------------------------------------------------------------

  it('wraps values containing commas in double quotes', () => {
    exportAssetsToCsv([makeAsset({ name: 'Laptop, Pro' })])
    expect(capturedCsv).toContain('"Laptop, Pro"')
  })

  it('wraps values containing double quotes and escapes them', () => {
    exportAssetsToCsv([makeAsset({ name: 'The "Best" Laptop' })])
    expect(capturedCsv).toContain('"The ""Best"" Laptop"')
  })

  it('wraps values containing newlines in double quotes', () => {
    exportAssetsToCsv([makeAsset({ notes: 'line1\nline2' })])
    expect(capturedCsv).toContain('"line1\nline2"')
  })

  it('outputs empty string for null values', () => {
    // purchaseCost is null → should produce an empty field, not "null"
    exportAssetsToCsv([makeAsset({ purchaseCost: null })], 'assets.csv', new Set(['purchaseCost']))
    const dataRow = capturedCsv.split('\n')[1]
    // last column should be empty
    expect(dataRow).toMatch(/,$|,""$|,\s*$/)
  })

  // ---------------------------------------------------------------------------
  // Column filtering
  // ---------------------------------------------------------------------------

  it('includes only the requested visible columns', () => {
    const visible: Set<ReportColumn> = new Set(['department', 'status'])
    exportAssetsToCsv([makeAsset()], 'assets.csv', visible)
    const headers = capturedCsv.split('\n')[0]
    expect(headers).toContain('Department')
    expect(headers).toContain('Status')
    expect(headers).not.toContain('Category')
    expect(headers).not.toContain('Vendor')
  })

  it('includes all columns when no filter is provided', () => {
    exportAssetsToCsv([makeAsset()])
    const headers = capturedCsv.split('\n')[0]
    expect(headers).toContain('Department')
    expect(headers).toContain('Category')
    expect(headers).toContain('Status')
    expect(headers).toContain('Purchase Cost')
  })
})
