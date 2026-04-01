import { vi } from 'vitest'

import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/lib/types'
import { canEdit, canManage } from '@/lib/utils/permissions'

import type { ActionClients, ActionContext } from '../_context'

// ---------------------------------------------------------------------------
// Chainable Supabase query builder stub
// ---------------------------------------------------------------------------

export function makeChain() {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi
      .fn()
      .mockImplementation((resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject)
      ),
  }
}

// ---------------------------------------------------------------------------
// Client factories
// ---------------------------------------------------------------------------

export function makeClients(
  chain: ReturnType<typeof makeChain>,
  opts: { userId?: string; email?: string; inviteUserByEmail?: ReturnType<typeof vi.fn> } = {}
): ActionClients {
  const {
    userId = 'user-actor-0001',
    email = 'actor@example.com',
    inviteUserByEmail = vi.fn().mockResolvedValue({ error: null }),
  } = opts

  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId, email } } }),
      },
    } as unknown as NonNullable<ActionClients['supabase']>,
    admin: {
      from: vi.fn().mockReturnValue(chain),
      auth: { admin: { inviteUserByEmail, deleteUser: vi.fn().mockResolvedValue({}) } },
    } as unknown as NonNullable<ActionClients['admin']>,
  }
}

export function makeUnauthenticatedClients(chain: ReturnType<typeof makeChain>): ActionClients {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as NonNullable<ActionClients['supabase']>,
    admin: {
      from: vi.fn().mockReturnValue(chain),
      auth: { admin: {} },
    } as unknown as NonNullable<ActionClients['admin']>,
  }
}

// ---------------------------------------------------------------------------
// ActionContext factory — for unit-testing permission logic without going
// through the full getContext() path
// ---------------------------------------------------------------------------

export function makeContext(overrides: Partial<ActionContext> = {}): ActionContext {
  const role: UserRole = overrides.role ?? 'admin'
  return {
    userId: 'user-actor-0001',
    orgId: 'org-0001',
    actorName: 'Test Actor',
    role,
    departmentIds: [],
    admin: {} as unknown as ReturnType<typeof createAdminClient>,
    requireRole(level: 'editor' | 'admin') {
      const allowed = level === 'admin' ? canManage(role) : canEdit(role)
      return allowed ? null : { error: 'Not authorised' }
    },
    ...overrides,
  }
}
