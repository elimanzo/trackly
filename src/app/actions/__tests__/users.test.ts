import { beforeEach, describe, expect, it } from 'vitest'

import {
  deleteAccountAction,
  leaveOrgAction,
  transferOwnershipAction,
  updateUserRoleAction,
} from '../users'

import { makeChain, makeClients, makeUnauthenticatedClients } from './_helpers'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ACTOR_ID = 'user-actor-0001'
const TARGET_ID = 'user-target-0001'

let chain: ReturnType<typeof makeChain>

beforeEach(() => {
  chain = makeChain()
})

// ---------------------------------------------------------------------------
// updateUserRoleAction
// Calls getContext() internally, so each test pre-seeds 3 maybeSingle calls
// (org lookup, membership, profile name) via seedContext before setting up test-specific mocks.
// ---------------------------------------------------------------------------

describe('updateUserRoleAction', () => {
  it('returns error when actor has no organisation', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    // membership lookup returns null → no org
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await updateUserRoleAction('acme-corp', TARGET_ID, 'editor', clients)

    expect(result).toEqual({ error: 'No organisation found' })
  })

  it('returns error when actor role is not owner or admin', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { orgId: 'org-0001', role: 'editor', actorName: 'Actor' },
    })

    const result = await updateUserRoleAction('acme-corp', TARGET_ID, 'viewer', clients)

    expect(result).toEqual({ error: 'Not authorised' })
  })

  it('returns error when actor tries to change their own role', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { orgId: 'org-0001', role: 'admin', actorName: 'Actor' },
    })

    const result = await updateUserRoleAction('acme-corp', ACTOR_ID, 'editor', clients)

    expect(result).toEqual({ error: 'You cannot change your own role' })
  })

  it('returns error when target user is not found in the org', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { orgId: 'org-0001', role: 'admin', actorName: 'Actor' },
    })
    chain.maybeSingle.mockResolvedValueOnce({ data: null }) // target membership not found

    const result = await updateUserRoleAction('acme-corp', TARGET_ID, 'editor', clients)

    expect(result).toEqual({ error: 'User not found' })
  })

  it('returns error when target user is the org owner', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { orgId: 'org-0001', role: 'admin', actorName: 'Actor' },
    })
    chain.maybeSingle.mockResolvedValueOnce({
      data: { role: 'owner', profiles: { full_name: 'Owner' } },
    })

    const result = await updateUserRoleAction('acme-corp', TARGET_ID, 'editor', clients)

    expect(result).toEqual({ error: "Cannot change the owner's role" })
  })

  it('returns null error on successful role change', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { orgId: 'org-0001', role: 'admin', actorName: 'Actor' },
    })
    chain.maybeSingle.mockResolvedValueOnce({
      data: { role: 'editor', profiles: { full_name: 'Target User' } },
    })

    const result = await updateUserRoleAction('acme-corp', TARGET_ID, 'viewer', clients)

    expect(result).toEqual({ error: null })
  })
})

// ---------------------------------------------------------------------------
// leaveOrgAction
// Uses getContext() — seed 3 maybySingle calls via seedContext.
// delete() calls resolve via the `then` mock (default: no error).
// ---------------------------------------------------------------------------

describe('leaveOrgAction', () => {
  it('returns error when not authenticated', async () => {
    const clients = makeUnauthenticatedClients(chain)

    const result = await leaveOrgAction('acme-corp', clients)

    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when org not found', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    chain.maybeSingle.mockResolvedValueOnce({ data: null }) // org by slug → not found

    const result = await leaveOrgAction('acme-corp', clients)

    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when actor is the owner', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { role: 'owner' },
    })

    const result = await leaveOrgAction('acme-corp', clients)

    expect(result).toEqual({
      error: 'Owners cannot leave — transfer ownership or delete the organisation first',
    })
  })

  it('returns null error on successful leave', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { role: 'editor' },
    })

    const result = await leaveOrgAction('acme-corp', clients)

    expect(result).toEqual({ error: null })
  })
})

// ---------------------------------------------------------------------------
// deleteAccountAction
// Does NOT call getContext(). Uses supabase.auth.getUser() + admin.from() directly.
// Array query (memberships) resolves via `then` mock.
// ---------------------------------------------------------------------------

describe('deleteAccountAction', () => {
  it('returns error when not authenticated', async () => {
    const clients = makeUnauthenticatedClients(chain)

    const result = await deleteAccountAction(clients)

    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when user has active memberships', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    chain.then.mockImplementationOnce((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [{ org_id: 'org-0001', role: 'admin' }], error: null }).then(resolve)
    )

    const result = await deleteAccountAction(clients)

    expect(result).toEqual({
      error: 'Leave or delete all your organisations before deleting your account',
    })
  })

  it('returns null error when user has no memberships', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    // default `then` returns { data: null } → no memberships

    const result = await deleteAccountAction(clients)

    expect(result).toEqual({ error: null })
  })
})

// ---------------------------------------------------------------------------
// transferOwnershipAction
// Uses getContext() — seed 3 maybySingle calls. Then maybySingle for target lookup.
// update() calls resolve via `then` mock (default: no error).
// ---------------------------------------------------------------------------

describe('transferOwnershipAction', () => {
  it('returns error when not authenticated', async () => {
    const clients = makeUnauthenticatedClients(chain)

    const result = await transferOwnershipAction('acme-corp', TARGET_ID, clients)

    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when actor is not the owner', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { role: 'admin' },
    })

    const result = await transferOwnershipAction('acme-corp', TARGET_ID, clients)

    expect(result).toEqual({ error: 'Only the organisation owner can transfer ownership' })
  })

  it('returns error when target is self', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { role: 'owner' },
    })

    const result = await transferOwnershipAction('acme-corp', ACTOR_ID, clients)

    expect(result).toEqual({ error: 'You are already the owner' })
  })

  it('returns error when target user is not found', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { role: 'owner' },
    })
    chain.maybeSingle.mockResolvedValueOnce({ data: null }) // target not found

    const result = await transferOwnershipAction('acme-corp', TARGET_ID, clients)

    expect(result).toEqual({ error: 'User not found' })
  })

  it('returns error when target is not an admin', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { role: 'owner' },
    })
    chain.maybeSingle.mockResolvedValueOnce({
      data: { role: 'editor', profiles: { full_name: 'Editor User' } },
    })

    const result = await transferOwnershipAction('acme-corp', TARGET_ID, clients)

    expect(result).toEqual({ error: 'Target user must be an admin to receive ownership' })
  })

  it('returns null error on successful transfer', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { role: 'owner' },
    })
    chain.maybeSingle.mockResolvedValueOnce({
      data: { role: 'admin', profiles: { full_name: 'New Owner' } },
    })

    const result = await transferOwnershipAction('acme-corp', TARGET_ID, clients)

    expect(result).toEqual({ error: null })
  })
})
