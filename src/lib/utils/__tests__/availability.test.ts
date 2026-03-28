import { describe, expect, it } from 'vitest'

import { computeAvailable, computeMaxForEdit } from '../availability'

describe('computeAvailable', () => {
  it('returns units remaining when some are checked out', () => {
    expect(computeAvailable(10, 3)).toBe(7)
  })

  it('returns 0 when all units are checked out', () => {
    expect(computeAvailable(5, 5)).toBe(0)
  })

  it('clamps to 0 when checked-out count exceeds total (data inconsistency)', () => {
    expect(computeAvailable(3, 5)).toBe(0)
  })

  it('returns the full quantity when nothing is checked out', () => {
    expect(computeAvailable(8, 0)).toBe(8)
  })
})

describe('computeMaxForEdit', () => {
  it('returns available + assignment quantity', () => {
    // 10 total, 7 checked out (3 available), editing an assignment of 4 → max 7
    expect(computeMaxForEdit(10, 7, 4)).toBe(7)
  })

  it('returns total when this is the only active assignment', () => {
    // 10 total, 6 checked out all from this assignment → max 10
    expect(computeMaxForEdit(10, 6, 6)).toBe(10)
  })

  it('clamps to 0 when the asset is over-allocated and the assignment contributes nothing', () => {
    expect(computeMaxForEdit(3, 5, 0)).toBe(0)
  })

  it('returns assignment quantity when no other units are checked out', () => {
    // 10 total, 2 checked out all from this assignment → max 10
    expect(computeMaxForEdit(10, 2, 2)).toBe(10)
  })
})
