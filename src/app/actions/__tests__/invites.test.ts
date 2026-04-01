import { beforeEach, describe, expect, it, vi } from 'vitest'

import { acceptInviteViaGoogleAction, sendInviteAction } from '../invites'

import { makeChain, makeClients } from './_helpers'

// Mock the raw @supabase/supabase-js client used for implicit-flow OTP
const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null })
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { signInWithOtp: mockSignInWithOtp } })),
}))

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
    chain.maybeSingle
      .mockResolvedValueOnce({ data: null }) // no duplicate invite
      .mockResolvedValueOnce({ data: null }) // no existing auth user

    const result = await sendInviteAction('new@example.com', 'editor', [], clients)

    expect(result).toEqual({ error: 'SMTP unavailable' })
    // Rollback should target the specific invite ID, not email+org
    expect(chain.eq).toHaveBeenCalledWith('id', 'new-invite-001')
  })

  it('keeps invite row and returns success when invitee already has an account', async () => {
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    chain.single
      .mockResolvedValueOnce({
        data: { org_id: 'org-0001', full_name: 'Actor', organizations: { name: 'Acme' } },
      })
      .mockResolvedValueOnce({ data: { id: 'new-invite-001' }, error: null })
    chain.maybeSingle
      .mockResolvedValueOnce({ data: null }) // no duplicate invite
      .mockResolvedValueOnce({ data: { id: 'existing-user' } }) // profile exists → use OTP

    const result = await sendInviteAction('existing@example.com', 'editor', [], clients)

    expect(result).toEqual({ error: null })
    // inviteUserByEmail must not be called — we used OTP instead
    expect(mockInviteUserByEmail).not.toHaveBeenCalled()
    // Must NOT have rolled back the invite row
    expect(chain.delete).not.toHaveBeenCalled()
  })

  it('returns null error on success', async () => {
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    chain.single
      .mockResolvedValueOnce({
        data: { org_id: 'org-0001', full_name: 'Actor', organizations: { name: 'Acme' } },
      })
      // insert.select.single
      .mockResolvedValueOnce({ data: { id: 'new-invite-001' }, error: null })
    chain.maybeSingle
      .mockResolvedValueOnce({ data: null }) // no duplicate invite
      .mockResolvedValueOnce({ data: null }) // no existing auth user

    const result = await sendInviteAction('new@example.com', 'viewer', [], clients)

    expect(result).toEqual({ error: null })
  })
})

// ---------------------------------------------------------------------------
// acceptInviteViaGoogleAction
// ---------------------------------------------------------------------------

const PENDING_INVITE = {
  id: 'invite-001',
  org_id: 'org-0001',
  role: 'editor',
  department_ids: ['dept-001'],
  expires_at: new Date(Date.now() + 86400_000).toISOString(),
  accepted_at: null,
}

describe('acceptInviteViaGoogleAction', () => {
  it('applies org/role/departments and returns null error on success', async () => {
    const clients = makeClients(chain, { email: 'invited@example.com' })
    chain.maybeSingle.mockResolvedValueOnce({ data: PENDING_INVITE })

    const result = await acceptInviteViaGoogleAction('Alex Rivera', clients)

    expect(result).toEqual({ error: null })
  })

  it('returns error when no pending invite exists', async () => {
    const clients = makeClients(chain, { email: 'noinvite@example.com' })
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await acceptInviteViaGoogleAction('Alex Rivera', clients)

    expect(result).toEqual({
      error: 'Invite not found or has expired. Ask your admin to resend it.',
    })
  })

  it('returns error when session is missing', async () => {
    const clients = makeClients(chain)
    clients.supabase!.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null } })

    const result = await acceptInviteViaGoogleAction('Alex Rivera', clients)

    expect(result).toEqual({ error: 'Session expired. Please use the invite link again.' })
  })
})
