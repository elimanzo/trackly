import { beforeEach, describe, expect, it } from 'vitest'

import { getContext } from '../_context'

import { makeChain, makeClients, makeUnauthenticatedClients } from './_helpers'

let chain: ReturnType<typeof makeChain>

beforeEach(() => {
  chain = makeChain()
})

describe('getContext', () => {
  it('returns context with correct orgId and role for a user with a membership', async () => {
    const clients = makeClients(chain, { userId: 'user-001' })
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', role: 'admin' } }) // membership
      .mockResolvedValueOnce({ data: { full_name: 'Alice' } }) // profile name

    const ctx = await getContext(clients)

    expect(ctx).not.toBeNull()
    expect(ctx?.orgId).toBe('org-0001')
    expect(ctx?.role).toBe('admin')
    expect(ctx?.actorName).toBe('Alice')
    expect(ctx?.userId).toBe('user-001')
  })

  it('returns null when user has no membership', async () => {
    const clients = makeClients(chain)
    chain.maybeSingle.mockResolvedValueOnce({ data: null }) // no membership

    const ctx = await getContext(clients)

    expect(ctx).toBeNull()
  })

  it('returns null when user is not authenticated', async () => {
    const clients = makeUnauthenticatedClients(chain)

    const ctx = await getContext(clients)

    expect(ctx).toBeNull()
  })

  it('includes departmentIds scoped to the active org', async () => {
    const clients = makeClients(chain, { userId: 'user-001' })
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { org_id: 'org-0001', role: 'editor' } })
      .mockResolvedValueOnce({ data: { full_name: 'Bob' } })
    // user_departments returns two rows for org-0001
    chain.then.mockImplementationOnce((resolve: (v: unknown) => void) =>
      Promise.resolve({
        data: [{ department_id: 'dept-001' }, { department_id: 'dept-002' }],
        error: null,
      }).then(resolve)
    )

    const ctx = await getContext(clients)

    expect(ctx?.departmentIds).toEqual(['dept-001', 'dept-002'])
  })
})
