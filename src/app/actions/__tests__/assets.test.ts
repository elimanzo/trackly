import { beforeEach, describe, expect, it } from 'vitest'

import type { AssetFormInput, CheckoutFormInput } from '@/lib/types'

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
// checkoutAsset
// ---------------------------------------------------------------------------

function makeCheckoutInput(overrides: Partial<CheckoutFormInput> = {}): CheckoutFormInput {
  return {
    assignedToUserId: '00000000-0000-4000-8000-000000000001',
    assignedToName: 'Alice',
    quantity: 1,
    departmentId: null,
    locationId: null,
    expectedReturnAt: null,
    notes: undefined,
    ...overrides,
  }
}

/** Helper: mock a fetchCheckedOut call (uses chain.then) */
function mockFetchCheckedOut(
  chain: ReturnType<typeof makeChain>,
  rows: { id: string; quantity: number }[]
) {
  chain.then.mockImplementationOnce((resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve({ data: rows, error: null }).then(resolve, reject)
  )
}

describe('checkoutAsset', () => {
  it('returns error when user is not authenticated', async () => {
    const clients = makeUnauthenticatedClients(chain)
    const result = await checkoutAsset('asset-0001', makeCheckoutInput(), 'Admin', false, clients)
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('rejects bulk checkout when pre-check shows insufficient stock', async () => {
    const clients = makeClients(chain)
    // getContext: profile + user_departments
    chain.maybeSingle.mockResolvedValueOnce({
      data: { org_id: 'org-0001', full_name: 'Admin', role: 'admin' },
    })
    chain.then.mockImplementationOnce(
      (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject)
    )
    // asset fetch: quantity=2, 2 already checked out → 0 available
    chain.single.mockResolvedValueOnce({
      data: { name: 'Laptop', quantity: 2, department_id: null },
    })
    // pre-check fetchCheckedOut → 2 checked out
    mockFetchCheckedOut(chain, [
      { id: 'asgn-001', quantity: 1 },
      { id: 'asgn-002', quantity: 1 },
    ])

    const result = await checkoutAsset(
      'asset-0001',
      makeCheckoutInput({ quantity: 1 }),
      'Admin',
      true,
      clients
    )
    expect(result).toEqual({ error: 'Only 0 available in stock.' })
  })

  it('rolls back assignment and returns error when post-insert re-check detects over-allocation', async () => {
    const clients = makeClients(chain)
    // getContext: profile + user_departments
    chain.maybeSingle.mockResolvedValueOnce({
      data: { org_id: 'org-0001', full_name: 'Admin', role: 'admin' },
    })
    chain.then.mockImplementationOnce(
      (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject)
    )
    // asset fetch: quantity=1
    chain.single
      .mockResolvedValueOnce({ data: { name: 'Laptop', quantity: 1, department_id: null } })
      // insert.select.single → assignment ID
      .mockResolvedValueOnce({ data: { id: 'asgn-new-001' }, error: null })
    // pre-check fetchCheckedOut → 0 checked out (passes fast-path)
    mockFetchCheckedOut(chain, [])
    // post-insert fetchCheckedOut → 2 total (concurrent checkout snuck in)
    mockFetchCheckedOut(chain, [
      { id: 'asgn-concurrent', quantity: 1 },
      { id: 'asgn-new-001', quantity: 1 },
    ])

    const result = await checkoutAsset(
      'asset-0001',
      makeCheckoutInput({ quantity: 1 }),
      'Admin',
      true,
      clients
    )
    expect(result).toEqual({ error: 'This item just went out of stock. Please try again.' })
    // Rollback by assignment ID
    expect(chain.eq).toHaveBeenCalledWith('id', 'asgn-new-001')
  })

  it('returns null on successful serialized checkout', async () => {
    const clients = makeClients(chain)
    // getContext: profile + user_departments
    chain.maybeSingle.mockResolvedValueOnce({
      data: { org_id: 'org-0001', full_name: 'Admin', role: 'admin' },
    })
    chain.then.mockImplementationOnce(
      (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject)
    )
    // asset fetch
    chain.single
      .mockResolvedValueOnce({ data: { name: 'Laptop', quantity: null, department_id: null } })
      // insert.select.single
      .mockResolvedValueOnce({ data: { id: 'asgn-new-001' }, error: null })

    const result = await checkoutAsset('asset-0001', makeCheckoutInput(), 'Admin', false, clients)
    expect(result).toBeNull()
  })
})
