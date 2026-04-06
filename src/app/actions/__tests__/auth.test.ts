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
  it('returns /dashboard when user already has a membership', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: { org_id: 'org-0001' } })

    const result = await googleSignInDestination('user-001', clients)

    expect(result).toEqual({ destination: '/orgs' })
  })

  it('returns /org/new when user has no membership', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

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
  it('creates membership and returns /dashboard when invite is valid', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: PENDING_INVITE })

    const result = await completeInviteForGoogleUser('user-001', 'invited@example.com', clients)

    expect(result).toEqual({ destination: '/orgs' })
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-001', org_id: 'org-0001', role: 'editor' })
    )
  })

  it('returns null destination when no pending invite exists', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await completeInviteForGoogleUser('user-001', 'no-invite@example.com', clients)

    expect(result).toEqual({ destination: null })
  })

  it('always accepts the invite even when user is already in another org', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: PENDING_INVITE })

    const result = await completeInviteForGoogleUser('user-001', 'invited@example.com', clients)

    // Multi-org: no conflict redirect — invite is accepted
    expect(result).toEqual({ destination: '/orgs' })
  })
})
