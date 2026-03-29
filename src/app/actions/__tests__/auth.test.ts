import { beforeEach, describe, expect, it } from 'vitest'

import { googleSignInDestination } from '../auth'

import { makeChain, makeClients, makeUnauthenticatedClients } from './_helpers'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let chain: ReturnType<typeof makeChain>

beforeEach(() => {
  chain = makeChain()
})

// ---------------------------------------------------------------------------
// googleSignInDestination
// ---------------------------------------------------------------------------

describe('googleSignInDestination', () => {
  it('returns /dashboard when user already has an org', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: { org_id: 'org-0001' } })

    const result = await googleSignInDestination(clients)

    expect(result).toEqual({ destination: '/dashboard' })
  })

  it('returns /org/new when user has no org', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: { org_id: null } })

    const result = await googleSignInDestination(clients)

    expect(result).toEqual({ destination: '/org/new' })
  })

  it('returns error when not authenticated', async () => {
    const clients = makeUnauthenticatedClients(chain)

    const result = await googleSignInDestination(clients)

    expect(result).toEqual({ error: 'Not authenticated' })
  })
})
