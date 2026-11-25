import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { startupContextQueryOptions, startupKeys } from '../query'

import { SpyStartupClient } from './fakes'

const USER = 'user-0001'

function seededClient() {
  return new SpyStartupClient({
    profile: {
      id: USER,
      full_name: 'Ada Lovelace',
      email: 'ada@example.com',
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    memberships: [
      {
        org_id: 'org-1',
        role: 'admin',
        invite_status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        organizations: { slug: 'acme', name: 'Acme' },
      },
    ],
    departments: [],
  })
}

describe('startupContextQueryOptions', () => {
  it('assembles the shell context from the client', async () => {
    const qc = new QueryClient()
    const ctx = await qc.fetchQuery(startupContextQueryOptions(seededClient(), USER))

    expect(ctx.profile?.email).toBe('ada@example.com')
    expect(ctx.memberships).toHaveLength(1)
    expect(ctx.memberships[0]?.orgSlug).toBe('acme')
  })

  it('keys the query by userId with a non-zero stale window', () => {
    const options = startupContextQueryOptions(seededClient(), USER)
    expect(options.queryKey).toEqual(startupKeys.context(USER))
    expect(options.staleTime).toBeGreaterThan(0)
  })

  it('does not re-invoke the shell query within the stale window across two navigations', async () => {
    const qc = new QueryClient()
    const options = startupContextQueryOptions(seededClient(), USER)
    const queryFn = vi.fn(options.queryFn)

    // Two client-side navigations, both inside the stale window.
    await qc.fetchQuery({ ...options, queryFn })
    await qc.fetchQuery({ ...options, queryFn })

    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('re-invokes the shell query after the key is invalidated (mutation / org switch)', async () => {
    const qc = new QueryClient()
    const options = startupContextQueryOptions(seededClient(), USER)
    const queryFn = vi.fn(options.queryFn)

    await qc.fetchQuery({ ...options, queryFn })
    await qc.invalidateQueries({ queryKey: startupKeys.context(USER) })
    await qc.fetchQuery({ ...options, queryFn })

    expect(queryFn).toHaveBeenCalledTimes(2)
  })
})
