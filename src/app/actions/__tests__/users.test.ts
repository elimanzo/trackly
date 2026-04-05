import { beforeEach, describe, expect, it } from 'vitest'

import { updateUserRoleAction } from '../users'

import { makeChain, makeClients } from './_helpers'

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
// Calls getContext() internally, so each test pre-seeds 2 maybeSingle calls
// (membership + profile name) via seedContext before setting up test-specific mocks.
// ---------------------------------------------------------------------------

describe('updateUserRoleAction', () => {
  it('returns error when actor has no organisation', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    // membership lookup returns null → no org
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await updateUserRoleAction(TARGET_ID, 'editor', clients)

    expect(result).toEqual({ error: 'No organisation found' })
  })

  it('returns error when actor role is not owner or admin', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { orgId: 'org-0001', role: 'editor', actorName: 'Actor' },
    })

    const result = await updateUserRoleAction(TARGET_ID, 'viewer', clients)

    expect(result).toEqual({ error: 'Not authorised' })
  })

  it('returns error when actor tries to change their own role', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { orgId: 'org-0001', role: 'admin', actorName: 'Actor' },
    })

    const result = await updateUserRoleAction(ACTOR_ID, 'editor', clients)

    expect(result).toEqual({ error: 'You cannot change your own role' })
  })

  it('returns error when target user is not found in the org', async () => {
    const clients = makeClients(chain, {
      userId: ACTOR_ID,
      seedContext: { orgId: 'org-0001', role: 'admin', actorName: 'Actor' },
    })
    chain.maybeSingle.mockResolvedValueOnce({ data: null }) // target membership not found

    const result = await updateUserRoleAction(TARGET_ID, 'editor', clients)

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

    const result = await updateUserRoleAction(TARGET_ID, 'editor', clients)

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

    const result = await updateUserRoleAction(TARGET_ID, 'viewer', clients)

    expect(result).toEqual({ error: null })
  })
})
