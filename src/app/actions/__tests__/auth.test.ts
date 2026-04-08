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
  it('returns org dashboard when user has exactly one membership', async () => {
    const clients = makeClients(chain)
    // membership list query resolves via then (array result)
    chain.then.mockImplementationOnce((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [{ org_id: 'org-0001' }], error: null }).then(resolve)
    )
    // slug lookup for the single org
    chain.maybeSingle.mockResolvedValueOnce({ data: { slug: 'acme' } })

    const result = await googleSignInDestination('user-001', clients)

    expect(result).toEqual({ destination: '/orgs/acme/dashboard' })
  })

  it('returns /orgs picker when user has multiple memberships', async () => {
    const clients = makeClients(chain)
    chain.then.mockImplementationOnce((resolve: (v: unknown) => void) =>
      Promise.resolve({
        data: [{ org_id: 'org-0001' }, { org_id: 'org-0002' }],
        error: null,
      }).then(resolve)
    )

    const result = await googleSignInDestination('user-001', clients)

    expect(result).toEqual({ destination: '/orgs' })
  })

  it('returns /org/new when user has no membership', async () => {
    const clients = makeClients(chain)
    chain.then.mockImplementationOnce((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve)
    )

    const result = await googleSignInDestination('user-001', clients)

    expect(result).toEqual({ destination: '/org/new' })
  })
})

// ---------------------------------------------------------------------------
// completeInviteForGoogleUser
// ---------------------------------------------------------------------------

const PENDING_INVITE = {
  id: 'invite-001',
  token: 'tok-abc-123',
  org_id: 'org-0001',
  role: 'editor',
  department_ids: ['dept-001', 'dept-002'],
  expires_at: new Date(Date.now() + 86400_000).toISOString(),
  accepted_at: null,
}

describe('completeInviteForGoogleUser', () => {
  it('returns confirm destination when a pending invite exists', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: PENDING_INVITE })

    const result = await completeInviteForGoogleUser('user-001', 'invited@example.com', clients)

    expect(result).toEqual({ destination: '/invite/confirm?token=tok-abc-123' })
    // Should NOT auto-accept — no upsert call
    expect(chain.upsert).not.toHaveBeenCalled()
  })

  it('returns null destination when no pending invite exists', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await completeInviteForGoogleUser('user-001', 'no-invite@example.com', clients)

    expect(result).toEqual({ destination: null })
  })

  it('returns confirm destination even when user is already in another org', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: PENDING_INVITE })

    const result = await completeInviteForGoogleUser('user-001', 'invited@example.com', clients)

    expect(result).toEqual({ destination: '/invite/confirm?token=tok-abc-123' })
  })
})
