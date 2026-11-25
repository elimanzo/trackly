import { describe, expect, it } from 'vitest'

import { loadStartupContext } from '../load'
import type { DepartmentRow, MembershipRow, ProfileRow } from '../ports'

import { SpyStartupClient } from './fakes'

const USER = 'user-001'

const profileRow: ProfileRow = {
  id: USER,
  full_name: 'Ada Lovelace',
  email: 'ada@example.com',
  avatar_url: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
}

const membershipRows: MembershipRow[] = [
  {
    org_id: 'org-acme',
    role: 'admin',
    invite_status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
    organizations: { slug: 'acme', name: 'Acme' },
  },
  {
    org_id: 'org-globex',
    role: 'viewer',
    invite_status: 'active',
    created_at: '2026-01-03T00:00:00.000Z',
    organizations: { slug: 'globex', name: 'Globex' },
  },
]

const departmentRows: DepartmentRow[] = [
  { org_id: 'org-acme', department_id: 'dept-eng', departments: { name: 'Engineering' } },
  { org_id: 'org-globex', department_id: 'dept-ops', departments: { name: 'Operations' } },
]

type Seed = {
  profile: ProfileRow | null
  memberships: MembershipRow[]
  departments: DepartmentRow[]
  slow?: string[]
}

function seed(overrides: Partial<Seed> = {}) {
  return new SpyStartupClient({
    profile: profileRow,
    memberships: membershipRows,
    departments: departmentRows,
    ...overrides,
  })
}

describe('loadStartupContext', () => {
  it('assembles profile, memberships, and departments', async () => {
    const ctx = await loadStartupContext(seed(), USER)

    expect(ctx.profile).toEqual({
      id: USER,
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
    expect(ctx.memberships).toEqual([
      {
        userId: USER,
        orgId: 'org-acme',
        orgSlug: 'acme',
        orgName: 'Acme',
        role: 'admin',
        inviteStatus: 'active',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        userId: USER,
        orgId: 'org-globex',
        orgSlug: 'globex',
        orgName: 'Globex',
        role: 'viewer',
        inviteStatus: 'active',
        createdAt: '2026-01-03T00:00:00.000Z',
      },
    ])
    expect(ctx.departments).toEqual([
      { orgId: 'org-acme', departmentId: 'dept-eng', name: 'Engineering' },
      { orgId: 'org-globex', departmentId: 'dept-ops', name: 'Operations' },
    ])
  })

  it('dispatches profile and memberships concurrently, before the dependent departments read', async () => {
    const client = seed()

    await loadStartupContext(client, USER)

    // Both siblings are dispatched before either resolves — i.e. not serialized.
    expect(client.events.indexOf('dispatch:user_org_memberships')).toBeLessThan(
      client.events.indexOf('resolve:profiles')
    )
    expect(client.events.indexOf('dispatch:profiles')).toBeLessThan(
      client.events.indexOf('resolve:user_org_memberships')
    )

    // Departments is genuinely dependent: it is not dispatched until memberships resolves.
    expect(client.events.indexOf('resolve:user_org_memberships')).toBeLessThan(
      client.events.indexOf('dispatch:user_departments')
    )
  })

  it('does not put the profile read on the dependent departments read critical path', async () => {
    // Profile resolves late; departments should still dispatch as soon as memberships resolves.
    const client = seed({ slow: ['profiles'] })

    await loadStartupContext(client, USER)

    expect(client.events.indexOf('dispatch:user_departments')).toBeLessThan(
      client.events.indexOf('resolve:profiles')
    )
  })

  it('scopes the departments read to the org ids from memberships', async () => {
    const client = seed()

    await loadStartupContext(client, USER)

    expect(client.departmentOrgIdFilter).toEqual(['org-acme', 'org-globex'])
  })

  it('skips the departments read entirely when the user has no memberships', async () => {
    const client = seed({ memberships: [], departments: [] })

    const ctx = await loadStartupContext(client, USER)

    expect(ctx.departments).toEqual([])
    expect(client.dispatched).not.toContain('user_departments')
  })

  it('returns a null profile when the user row is missing, still assembling the rest', async () => {
    const client = seed({ profile: null })

    const ctx = await loadStartupContext(client, USER)

    expect(ctx.profile).toBeNull()
    expect(ctx.memberships).toHaveLength(2)
  })
})
