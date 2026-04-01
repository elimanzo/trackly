import { beforeEach, describe, expect, it } from 'vitest'

import { completeInviteForGoogleUser, googleSignInDestination } from '../auth'

import { makeChain, makeClients } from './_helpers'

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

    const result = await googleSignInDestination('user-001', clients)

    expect(result).toEqual({ destination: '/dashboard' })
  })

  it('returns /org/new when user has no org', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: { org_id: null } })

    const result = await googleSignInDestination('user-001', clients)

    expect(result).toEqual({ destination: '/org/new' })
  })
})

// ---------------------------------------------------------------------------
// completeInviteForGoogleUser
// ---------------------------------------------------------------------------

const PENDING_INVITE = {
  id: 'invite-001',
  org_id: 'org-0001',
  role: 'editor',
  department_ids: ['dept-001', 'dept-002'],
  expires_at: new Date(Date.now() + 86400_000).toISOString(),
  accepted_at: null,
}

describe('completeInviteForGoogleUser', () => {
  it('completes the invite and returns /dashboard when user has no org', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle
      .mockResolvedValueOnce({ data: PENDING_INVITE }) // invite lookup
      .mockResolvedValueOnce({ data: { org_id: null } }) // profile lookup

    const result = await completeInviteForGoogleUser('user-001', 'invited@example.com', clients)

    expect(result).toEqual({ destination: '/dashboard' })
  })

  it('returns null destination when no pending invite exists', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await completeInviteForGoogleUser('user-001', 'no-invite@example.com', clients)

    expect(result).toEqual({ destination: null })
  })

  it('returns /invite/conflict when user already belongs to an org', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle
      .mockResolvedValueOnce({ data: PENDING_INVITE }) // invite lookup
      .mockResolvedValueOnce({ data: { org_id: 'org-other' } }) // profile lookup

    const result = await completeInviteForGoogleUser('user-001', 'invited@example.com', clients)

    expect(result).toEqual({ destination: '/invite/conflict' })
  })
})
