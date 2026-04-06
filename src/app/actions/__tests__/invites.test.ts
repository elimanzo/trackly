import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  acceptAuthenticatedInviteAction,
  acceptInviteViaGoogleAction,
  sendInviteAction,
} from '../invites'

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
// sendInviteAction fetches actor context itself (does not call getContext),
// so there is no context pre-seeding needed.
// ---------------------------------------------------------------------------

describe('sendInviteAction', () => {
  it('returns error when actor has no organisation', async () => {
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    // membership lookup returns null
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await sendInviteAction('new@example.com', 'editor', [], clients)

    expect(result).toEqual({ error: 'No organisation found' })
  })

  it('returns error when a pending invite already exists for that email', async () => {
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', organizations: { name: 'Acme' } } }) // actor membership
      .mockResolvedValueOnce({ data: { full_name: 'Actor' } }) // actor profile name
      .mockResolvedValueOnce({ data: { id: 'invite-existing-001' } }) // duplicate invite exists

    const result = await sendInviteAction('already@example.com', 'editor', [], clients)

    expect(result).toEqual({ error: 'A pending invite already exists for this email' })
  })

  it('rolls back the invite row by ID and returns error when auth invite fails', async () => {
    mockInviteUserByEmail.mockResolvedValueOnce({ error: { message: 'SMTP unavailable' } })
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', organizations: { name: 'Acme' } } }) // actor membership
      .mockResolvedValueOnce({ data: { full_name: 'Actor' } }) // actor profile name
      .mockResolvedValueOnce({ data: null }) // no duplicate invite
      .mockResolvedValueOnce({ data: null }) // no existing profile
    chain.single
      // insert.select.single — returns the new invite's ID
      .mockResolvedValueOnce({ data: { id: 'new-invite-001' }, error: null })

    const result = await sendInviteAction('new@example.com', 'editor', [], clients)

    expect(result).toEqual({ error: 'SMTP unavailable' })
    // Rollback should target the specific invite ID, not email+org
    expect(chain.eq).toHaveBeenCalledWith('id', 'new-invite-001')
  })

  it('uses OTP and keeps invite row when invitee already has an account', async () => {
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', organizations: { name: 'Acme' } } }) // actor membership
      .mockResolvedValueOnce({ data: { full_name: 'Actor' } }) // actor profile name
      .mockResolvedValueOnce({ data: null }) // no duplicate invite
      .mockResolvedValueOnce({ data: { id: 'existing-user' } }) // profile exists → OTP
    chain.single.mockResolvedValueOnce({ data: { id: 'new-invite-001' }, error: null })

    const result = await sendInviteAction('existing@example.com', 'editor', [], clients)

    expect(result).toEqual({ error: null })
    expect(mockInviteUserByEmail).not.toHaveBeenCalled()
    expect(chain.delete).not.toHaveBeenCalled()
  })

  it('returns null error on success', async () => {
    const clients = makeClients(chain, { inviteUserByEmail: mockInviteUserByEmail })
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', organizations: { name: 'Acme' } } }) // actor membership
      .mockResolvedValueOnce({ data: { full_name: 'Actor' } }) // actor profile name
      .mockResolvedValueOnce({ data: null }) // no duplicate invite
      .mockResolvedValueOnce({ data: null }) // no existing profile
    chain.single.mockResolvedValueOnce({ data: { id: 'new-invite-001' }, error: null })

    const result = await sendInviteAction('new@example.com', 'viewer', [], clients)

    expect(result).toEqual({ error: null })
  })
})

// ---------------------------------------------------------------------------
// acceptInviteViaGoogleAction
// ---------------------------------------------------------------------------

const PENDING_INVITE = {
  id: 'invite-001',
  token: 'tok-xyz-789',
  email: 'invited@example.com',
  org_id: 'org-0001',
  role: 'editor',
  department_ids: ['dept-001'],
  expires_at: new Date(Date.now() + 86400_000).toISOString(),
  accepted_at: null,
  organizations: { slug: 'acme' },
}

describe('acceptInviteViaGoogleAction', () => {
  it('creates membership row and returns null error on success', async () => {
    const clients = makeClients(chain, { email: 'invited@example.com' })
    chain.maybeSingle.mockResolvedValueOnce({ data: PENDING_INVITE })

    const result = await acceptInviteViaGoogleAction('Alex Rivera', clients)

    expect(result).toEqual({ error: null })
    // membership upsert must have been called
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-actor-0001', org_id: 'org-0001', role: 'editor' })
    )
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

// ---------------------------------------------------------------------------
// acceptAuthenticatedInviteAction
// ---------------------------------------------------------------------------

describe('acceptAuthenticatedInviteAction', () => {
  it('creates membership and returns orgSlug on success', async () => {
    const clients = makeClients(chain, { email: 'invited@example.com' })
    chain.maybeSingle.mockResolvedValueOnce({ data: PENDING_INVITE })

    const result = await acceptAuthenticatedInviteAction('tok-xyz-789', clients)

    expect(result).toEqual({ orgSlug: 'acme' })
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-actor-0001', org_id: 'org-0001', role: 'editor' })
    )
  })

  it('returns error when invite not found or expired', async () => {
    const clients = makeClients(chain, { email: 'invited@example.com' })
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    const result = await acceptAuthenticatedInviteAction('bad-token', clients)

    expect(result).toEqual({
      error: 'Invite not found or has expired. Ask your admin to resend it.',
    })
  })

  it('returns error when invite email does not match session email', async () => {
    const clients = makeClients(chain, { email: 'other@example.com' })
    chain.maybeSingle.mockResolvedValueOnce({ data: PENDING_INVITE })

    const result = await acceptAuthenticatedInviteAction('tok-xyz-789', clients)

    expect(result).toEqual({ error: 'This invite was sent to a different email address.' })
  })

  it('returns error when session is missing', async () => {
    const clients = makeClients(chain)
    clients.supabase!.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null } })

    const result = await acceptAuthenticatedInviteAction('tok-xyz-789', clients)

    expect(result).toEqual({ error: 'Session expired. Please sign in again.' })
  })

  it('works when user is already in another org (multi-org)', async () => {
    // invite is for org-0001, user is already in org-0002 — should still succeed
    const clients = makeClients(chain, { email: 'invited@example.com' })
    chain.maybeSingle.mockResolvedValueOnce({ data: PENDING_INVITE })

    const result = await acceptAuthenticatedInviteAction('tok-xyz-789', clients)

    expect(result).toEqual({ orgSlug: 'acme' })
  })
})
