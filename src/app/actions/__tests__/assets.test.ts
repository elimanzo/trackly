import { beforeEach, describe, expect, it } from 'vitest'

import type { AssetFormInput } from '@/lib/types'

import { checkoutAsset, createAsset, deleteAsset } from '../assets'

import { makeChain, makeClients, makeUnauthenticatedClients } from './_helpers'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<AssetFormInput> = {}): AssetFormInput {
  return {
    name: 'Test Laptop',
    assetTag: 'AST-00001',
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
    ...overrides,
  }
}

let chain: ReturnType<typeof makeChain>

beforeEach(() => {
  chain = makeChain()
})

// ---------------------------------------------------------------------------
// createAsset
// ---------------------------------------------------------------------------

describe('createAsset', () => {
  it('returns validation error when name is too short', async () => {
    const result = await createAsset(makeInput({ name: 'X' }))
    expect(result).toMatchObject({ error: expect.stringContaining('2 characters') })
  })

  it('returns error when user is not authenticated', async () => {
    const clients = makeUnauthenticatedClients(chain)
    const result = await createAsset(makeInput(), clients)
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when viewer tries to create an asset', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({
      data: { org_id: 'org-0001', full_name: 'User', role: 'viewer' },
    })

    const result = await createAsset(makeInput(), clients)
    expect(result).toEqual({ error: 'Not authorised' })
  })

  it('returns friendly error on duplicate asset tag (23505)', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({
      data: { org_id: 'org-0001', full_name: 'User', role: 'admin' },
    })
    chain.single.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'unique violation' },
    })

    const result = await createAsset(makeInput(), clients)
    expect(result).toEqual({ error: 'Asset tag already exists. Use a unique tag.' })
  })

  it('returns the new asset id on success', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({
      data: { org_id: 'org-0001', full_name: 'User', role: 'admin' },
    })
    chain.single.mockResolvedValueOnce({ data: { id: 'asset-new-001' }, error: null })

    const result = await createAsset(makeInput(), clients)
    expect(result).toEqual({ id: 'asset-new-001' })
  })
})

// ---------------------------------------------------------------------------
// deleteAsset
// ---------------------------------------------------------------------------

describe('deleteAsset', () => {
  it('returns error when user is not authenticated', async () => {
    const clients = makeUnauthenticatedClients(chain)
    const result = await deleteAsset('asset-0001', clients)
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when viewer tries to delete an asset', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', full_name: 'User', role: 'viewer' } })
      .mockResolvedValueOnce({ data: { name: 'Test Laptop', department_id: null } })

    const result = await deleteAsset('asset-0001', clients)
    expect(result).toEqual({ error: 'Not authorised' })
  })

  it('returns error when the database update fails', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', full_name: 'User', role: 'admin' } })
      .mockResolvedValueOnce({ data: { name: 'Test Laptop', department_id: null } })
    // getContext runs Promise.all — first `then` is consumed by user_departments query
    chain.then
      .mockImplementationOnce((resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject)
      )
      .mockImplementationOnce((resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: { message: 'Row not found' } }).then(resolve, reject)
      )

    const result = await deleteAsset('asset-0001', clients)
    expect(result).toEqual({ error: 'Row not found' })
  })

  it('returns null on successful soft-delete', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', full_name: 'User', role: 'admin' } })
      .mockResolvedValueOnce({ data: { name: 'Test Laptop', department_id: null } })

    const result = await deleteAsset('asset-0001', clients)
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// checkoutAsset — action-layer only (domain logic covered in lib/checkout/__tests__)
// ---------------------------------------------------------------------------

describe('checkoutAsset', () => {
  it('returns error when user is not authenticated', async () => {
    const clients = makeUnauthenticatedClients(chain)
    const result = await checkoutAsset(
      { id: 'asset-0001', isBulk: false },
      {
        assignedToUserId: '00000000-0000-4000-8000-000000000001',
        assignedToName: 'Alice',
        quantity: 1,
        departmentId: null,
        locationId: null,
        expectedReturnAt: null,
      },
      'Admin',
      clients
    )
    expect(result).toEqual({ error: 'Not authenticated' })
  })
})
