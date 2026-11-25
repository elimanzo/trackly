import { describe, expect, it } from 'vitest'

import { resolveOrgAccess } from '../resolve'

import { SpyOrgAccessClient, type SeededMembership } from './fakes'

const USER = 'user-001'
const SLUG = 'acme'
const ORG_ID = 'org-acme'

const activeMember: SeededMembership = {
  userId: USER,
  slug: SLUG,
  orgId: ORG_ID,
  inviteStatus: 'active',
}

describe('resolveOrgAccess', () => {
  it('grants access to an active member and returns the org id', async () => {
    const client = new SpyOrgAccessClient([activeMember])

    const access = await resolveOrgAccess(client, { userId: USER, slug: SLUG })

    expect(access).toEqual({ isMember: true, orgId: ORG_ID })
  })

  it('resolves in exactly one query, not the old five round-trips', async () => {
    const client = new SpyOrgAccessClient([activeMember])

    await resolveOrgAccess(client, { userId: USER, slug: SLUG })

    expect(client.fromCalls).toBe(1)
  })

  it('denies a non-member of an existing org', async () => {
    const client = new SpyOrgAccessClient([
      { userId: 'someone-else', slug: SLUG, orgId: ORG_ID, inviteStatus: 'active' },
    ])

    const access = await resolveOrgAccess(client, { userId: USER, slug: SLUG })

    expect(access).toEqual({ isMember: false, orgId: null })
  })

  it('denies an unknown slug', async () => {
    const client = new SpyOrgAccessClient([activeMember])

    const access = await resolveOrgAccess(client, { userId: USER, slug: 'ghost-org' })

    expect(access).toEqual({ isMember: false, orgId: null })
  })

  it('denies a deactivated membership', async () => {
    const client = new SpyOrgAccessClient([
      { userId: USER, slug: SLUG, orgId: ORG_ID, inviteStatus: 'deactivated' },
    ])

    const access = await resolveOrgAccess(client, { userId: USER, slug: SLUG })

    expect(access).toEqual({ isMember: false, orgId: null })
  })
})
