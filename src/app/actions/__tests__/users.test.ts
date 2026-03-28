/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import { updateUserRoleAction } from '../users'

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/admin')

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ACTOR_ID = 'user-actor-0001'
const TARGET_ID = 'user-target-0001'

function makeChain() {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi
      .fn()
      .mockImplementation((resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject)
      ),
  }
}

let chain: ReturnType<typeof makeChain>

beforeEach(() => {
  chain = makeChain()

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: ACTOR_ID } } }),
    },
  } as any)

  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn().mockReturnValue(chain),
    auth: { admin: {} },
  } as any)
})

// ---------------------------------------------------------------------------
// updateUserRoleAction
// ---------------------------------------------------------------------------

describe('updateUserRoleAction', () => {
  it('returns error when actor profile has no organisation', async () => {
    chain.single.mockResolvedValueOnce({ data: null })

    const result = await updateUserRoleAction(TARGET_ID, 'editor')

    expect(result).toEqual({ error: 'No organisation found' })
  })

  it('returns error when actor role is not owner or admin', async () => {
    chain.single.mockResolvedValueOnce({
      data: { org_id: 'org-0001', role: 'editor', full_name: 'Actor' },
    })

    const result = await updateUserRoleAction(TARGET_ID, 'viewer')

    expect(result).toEqual({ error: 'Not authorised' })
  })

  it('returns error when actor tries to change their own role', async () => {
    chain.single.mockResolvedValueOnce({
      data: { org_id: 'org-0001', role: 'admin', full_name: 'Actor' },
    })

    const result = await updateUserRoleAction(ACTOR_ID, 'editor')

    expect(result).toEqual({ error: 'You cannot change your own role' })
  })

  it('returns error when target user is not found in the org', async () => {
    chain.single
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', role: 'admin', full_name: 'Actor' } })
      .mockResolvedValueOnce({ data: null })

    const result = await updateUserRoleAction(TARGET_ID, 'editor')

    expect(result).toEqual({ error: 'User not found' })
  })

  it('returns error when target user is the org owner', async () => {
    chain.single
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', role: 'admin', full_name: 'Actor' } })
      .mockResolvedValueOnce({ data: { role: 'owner' } })

    const result = await updateUserRoleAction(TARGET_ID, 'editor')

    expect(result).toEqual({ error: "Cannot change the owner's role" })
  })

  it('returns null error on successful role change', async () => {
    chain.single
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', role: 'admin', full_name: 'Actor' } })
      .mockResolvedValueOnce({ data: { role: 'editor' } })
    chain.maybeSingle.mockResolvedValueOnce({ data: { full_name: 'Target User' } })

    const result = await updateUserRoleAction(TARGET_ID, 'viewer')

    expect(result).toEqual({ error: null })
  })
})
