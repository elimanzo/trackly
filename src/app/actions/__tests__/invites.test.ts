import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sendInviteAction } from '../invites'

import { makeChain, makeClients } from './_helpers'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let chain: ReturnType<typeof makeChain>
let mockInviteUserByEmail: ReturnType<typeof vi.fn>

beforeEach(() => {
  chain = makeChain()
  mockInviteUserByEmail = vi.fn().mockResolvedValue({ error: null })
})

// ---------------------------------------------------------------------------
// sendInviteAction
// ---------------------------------------------------------------------------

describe('sendInviteAction', () => {
  it('returns error when actor has no organisation', async () => {
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    chain.single.mockResolvedValueOnce({ data: null })

    const result = await sendInviteAction('new@example.com', 'editor', [], clients)

    expect(result).toEqual({ error: 'No organisation found' })
  })

  it('returns error when a pending invite already exists for that email', async () => {
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    chain.single.mockResolvedValueOnce({
      data: { org_id: 'org-0001', full_name: 'Actor', organizations: { name: 'Acme' } },
    })
    chain.maybeSingle.mockResolvedValueOnce({ data: { id: 'invite-existing-001' } })

    const result = await sendInviteAction('already@example.com', 'editor', [], clients)

    expect(result).toEqual({ error: 'A pending invite already exists for this email' })
  })

  it('rolls back the invite row by ID and returns error when auth invite fails', async () => {
    mockInviteUserByEmail.mockResolvedValueOnce({ error: { message: 'SMTP unavailable' } })
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    chain.single
      .mockResolvedValueOnce({
        data: { org_id: 'org-0001', full_name: 'Actor', organizations: { name: 'Acme' } },
      })
      // insert.select.single — returns the new invite's ID
      .mockResolvedValueOnce({ data: { id: 'new-invite-001' }, error: null })
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await sendInviteAction('new@example.com', 'editor', [], clients)

    expect(result).toEqual({ error: 'SMTP unavailable' })
    // Rollback should target the specific invite ID, not email+org
    expect(chain.eq).toHaveBeenCalledWith('id', 'new-invite-001')
  })

  it('returns null error on success', async () => {
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    chain.single
      .mockResolvedValueOnce({
        data: { org_id: 'org-0001', full_name: 'Actor', organizations: { name: 'Acme' } },
      })
      // insert.select.single
      .mockResolvedValueOnce({ data: { id: 'new-invite-001' }, error: null })
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await sendInviteAction('new@example.com', 'viewer', [], clients)

    expect(result).toEqual({ error: null })
  })
})
