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
// ---------------------------------------------------------------------------

describe('updateUserRoleAction', () => {
  it('returns error when actor profile has no organisation', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    chain.single.mockResolvedValueOnce({ data: null })

    const result = await updateUserRoleAction(TARGET_ID, 'editor', clients)

    expect(result).toEqual({ error: 'No organisation found' })
  })

  it('returns error when actor role is not owner or admin', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    chain.single.mockResolvedValueOnce({
      data: { org_id: 'org-0001', role: 'editor', full_name: 'Actor' },
    })

    const result = await updateUserRoleAction(TARGET_ID, 'viewer', clients)

    expect(result).toEqual({ error: 'Not authorised' })
  })

  it('returns error when actor tries to change their own role', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    chain.single.mockResolvedValueOnce({
      data: { org_id: 'org-0001', role: 'admin', full_name: 'Actor' },
    })

    const result = await updateUserRoleAction(ACTOR_ID, 'editor', clients)

    expect(result).toEqual({ error: 'You cannot change your own role' })
  })

  it('returns error when target user is not found in the org', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    chain.single
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', role: 'admin', full_name: 'Actor' } })
      .mockResolvedValueOnce({ data: null })

    const result = await updateUserRoleAction(TARGET_ID, 'editor', clients)

    expect(result).toEqual({ error: 'User not found' })
  })

  it('returns error when target user is the org owner', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    chain.single
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', role: 'admin', full_name: 'Actor' } })
      .mockResolvedValueOnce({ data: { role: 'owner' } })

    const result = await updateUserRoleAction(TARGET_ID, 'editor', clients)

    expect(result).toEqual({ error: "Cannot change the owner's role" })
  })

  it('returns null error on successful role change', async () => {
    const clients = makeClients(chain, { userId: ACTOR_ID })
    chain.single
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', role: 'admin', full_name: 'Actor' } })
      .mockResolvedValueOnce({ data: { role: 'editor' } })
    chain.maybeSingle.mockResolvedValueOnce({ data: { full_name: 'Target User' } })

    const result = await updateUserRoleAction(TARGET_ID, 'viewer', clients)

    expect(result).toEqual({ error: null })
  })
})
