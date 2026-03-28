/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import { sendInviteAction } from '../invites'

vi.mock('@/lib/supabase/server')
vi.mock('@/lib/supabase/admin')

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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
let mockInviteUserByEmail: ReturnType<typeof vi.fn>

beforeEach(() => {
  chain = makeChain()
  mockInviteUserByEmail = vi.fn().mockResolvedValue({ error: null })

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-actor-0001' } } }),
    },
  } as any)

  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn().mockReturnValue(chain),
    auth: { admin: { inviteUserByEmail: mockInviteUserByEmail } },
  } as any)
})

// ---------------------------------------------------------------------------
// sendInviteAction
// ---------------------------------------------------------------------------

describe('sendInviteAction', () => {
  it('returns error when actor has no organisation', async () => {
    chain.single.mockResolvedValueOnce({ data: null })

    const result = await sendInviteAction('new@example.com', 'editor')

    expect(result).toEqual({ error: 'No organisation found' })
  })

  it('returns error when a pending invite already exists for that email', async () => {
    chain.single.mockResolvedValueOnce({
      data: { org_id: 'org-0001', full_name: 'Actor', organizations: { name: 'Acme' } },
    })
    // existing invite found
    chain.maybeSingle.mockResolvedValueOnce({ data: { id: 'invite-existing-001' } })

    const result = await sendInviteAction('already@example.com', 'editor')

    expect(result).toEqual({ error: 'A pending invite already exists for this email' })
  })

  it('rolls back the invite row and returns error when auth invite fails', async () => {
    chain.single.mockResolvedValueOnce({
      data: { org_id: 'org-0001', full_name: 'Actor', organizations: { name: 'Acme' } },
    })
    // no existing invite
    chain.maybeSingle.mockResolvedValueOnce({ data: null })
    mockInviteUserByEmail.mockResolvedValueOnce({ error: { message: 'SMTP unavailable' } })

    const result = await sendInviteAction('new@example.com', 'editor')

    expect(result).toEqual({ error: 'SMTP unavailable' })
    // rollback: delete was called on the chain
    expect(chain.delete).toHaveBeenCalled()
  })

  it('returns null error on success', async () => {
    chain.single.mockResolvedValueOnce({
      data: { org_id: 'org-0001', full_name: 'Actor', organizations: { name: 'Acme' } },
    })
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await sendInviteAction('new@example.com', 'viewer')

    expect(result).toEqual({ error: null })
  })
})
