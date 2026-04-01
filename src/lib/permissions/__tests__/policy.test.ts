import { describe, expect, it } from 'vitest'

import { createPolicy } from '../policy'

const DEPT_A = 'dept-aaaa-0000'
const DEPT_B = 'dept-bbbb-1111'

// ---------------------------------------------------------------------------
// enforce
// ---------------------------------------------------------------------------

describe('enforce — role gate', () => {
  it('allows owner for any action', () => {
    const policy = createPolicy({ role: 'owner', departmentIds: [] })
    expect(policy.enforce('asset:create', null)).toBeNull()
    expect(policy.enforce('org:manage')).toBeNull()
  })

  it('allows admin for editor-level and admin-level actions', () => {
    const policy = createPolicy({ role: 'admin', departmentIds: [] })
    expect(policy.enforce('asset:update', DEPT_A)).toBeNull()
    expect(policy.enforce('department:manage')).toBeNull()
  })

  it('denies admin for owner-only actions', () => {
    const policy = createPolicy({ role: 'admin', departmentIds: [] })
    expect(policy.enforce('org:manage')).toEqual({ error: 'Not authorised' })
  })

  it('denies viewer for editor-level actions', () => {
    const policy = createPolicy({ role: 'viewer', departmentIds: [DEPT_A] })
    expect(policy.enforce('asset:create', DEPT_A)).toEqual({ error: 'Not authorised' })
  })

  it('denies viewer for admin-level actions', () => {
    const policy = createPolicy({ role: 'viewer', departmentIds: [] })
    expect(policy.enforce('department:manage')).toEqual({ error: 'Not authorised' })
  })
})

describe('enforce — department scope for editors', () => {
  it('allows editor in their assigned department', () => {
    const policy = createPolicy({ role: 'editor', departmentIds: [DEPT_A] })
    expect(policy.enforce('asset:update', DEPT_A)).toBeNull()
  })

  it('denies editor outside their departments', () => {
    const policy = createPolicy({ role: 'editor', departmentIds: [DEPT_B] })
    expect(policy.enforce('asset:update', DEPT_A)).toEqual({ error: 'Not authorised' })
  })

  it('denies editor when asset has no department', () => {
    const policy = createPolicy({ role: 'editor', departmentIds: [DEPT_A] })
    expect(policy.enforce('asset:update', null)).toEqual({ error: 'Not authorised' })
  })

  it('allows owner regardless of department', () => {
    const policy = createPolicy({ role: 'owner', departmentIds: [] })
    expect(policy.enforce('asset:delete', null)).toBeNull()
    expect(policy.enforce('asset:delete', DEPT_A)).toBeNull()
  })

  it('allows admin regardless of department', () => {
    const policy = createPolicy({ role: 'admin', departmentIds: [] })
    expect(policy.enforce('asset:checkout', DEPT_A)).toBeNull()
  })
})

describe('enforce — all asset actions use the same dept-scoped rule', () => {
  const editor = createPolicy({ role: 'editor', departmentIds: [DEPT_A] })

  it.each([
    'asset:create',
    'asset:update',
    'asset:delete',
    'asset:checkout',
    'asset:return',
    'asset:restock',
    'assignment:update',
  ] as const)('%s allows editor in dept', (action) => {
    expect(editor.enforce(action, DEPT_A)).toBeNull()
  })

  it.each([
    'asset:create',
    'asset:update',
    'asset:delete',
    'asset:checkout',
    'asset:return',
    'asset:restock',
    'assignment:update',
  ] as const)('%s denies editor outside dept', (action) => {
    expect(editor.enforce(action, DEPT_B)).toEqual({ error: 'Not authorised' })
  })
})

// ---------------------------------------------------------------------------
// queryConstraint
// ---------------------------------------------------------------------------

describe('queryConstraint', () => {
  it('returns all for owner', () => {
    const policy = createPolicy({ role: 'owner', departmentIds: [] })
    expect(policy.queryConstraint()).toEqual({ kind: 'all' })
  })

  it('returns all for admin', () => {
    const policy = createPolicy({ role: 'admin', departmentIds: [DEPT_A] })
    expect(policy.queryConstraint()).toEqual({ kind: 'all' })
  })

  it('returns in for editor with departments', () => {
    const policy = createPolicy({ role: 'editor', departmentIds: [DEPT_A, DEPT_B] })
    expect(policy.queryConstraint()).toEqual({ kind: 'in', ids: [DEPT_A, DEPT_B] })
  })

  it('returns none for editor with no departments', () => {
    const policy = createPolicy({ role: 'editor', departmentIds: [] })
    expect(policy.queryConstraint()).toEqual({ kind: 'none' })
  })

  it('returns in for viewer with departments', () => {
    const policy = createPolicy({ role: 'viewer', departmentIds: [DEPT_A] })
    expect(policy.queryConstraint()).toEqual({ kind: 'in', ids: [DEPT_A] })
  })

  it('returns none for viewer with no departments', () => {
    const policy = createPolicy({ role: 'viewer', departmentIds: [] })
    expect(policy.queryConstraint()).toEqual({ kind: 'none' })
  })
})
