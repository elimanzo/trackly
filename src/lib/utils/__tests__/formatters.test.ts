import { describe, expect, it } from 'vitest'

import {
  formatCompactCurrency,
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  generateAssetTag,
  getInitials,
  slugify,
} from '@/lib/utils/formatters'

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe('formatCurrency', () => {
  it('formats a positive amount', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats a large amount with thousands separator', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00')
  })
})

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns em dash for empty string', () => {
    expect(formatDate('')).toBe('—')
  })

  it('returns em dash for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—')
  })

  it('formats a valid ISO date string', () => {
    expect(formatDate('2024-01-15')).toBe('Jan 15, 2024')
  })

  it('formats another valid date', () => {
    expect(formatDate('2023-12-31')).toBe('Dec 31, 2023')
  })
})

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe('formatDateTime', () => {
  it('returns em dash for null', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('returns em dash for undefined', () => {
    expect(formatDateTime(undefined)).toBe('—')
  })

  it('returns em dash for an invalid string', () => {
    expect(formatDateTime('bad')).toBe('—')
  })

  it('includes the date portion in the output', () => {
    const result = formatDateTime('2024-06-15T14:30:00Z')
    expect(result).toContain('Jun 15, 2024')
  })
})

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

describe('formatRelativeTime', () => {
  it('returns em dash for null', () => {
    expect(formatRelativeTime(null)).toBe('—')
  })

  it('returns em dash for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('—')
  })

  it('returns em dash for invalid string', () => {
    expect(formatRelativeTime('invalid')).toBe('—')
  })

  it('returns a relative string ending with "ago" for a past date', () => {
    expect(formatRelativeTime('2020-01-01T00:00:00Z')).toMatch(/ago$/)
  })
})

// ---------------------------------------------------------------------------
// generateAssetTag
// ---------------------------------------------------------------------------

describe('generateAssetTag', () => {
  it('pads single digits to 5 places', () => {
    expect(generateAssetTag(1)).toBe('AST-00001')
  })

  it('pads double digits', () => {
    expect(generateAssetTag(42)).toBe('AST-00042')
  })

  it('handles exactly 5 digits', () => {
    expect(generateAssetTag(99999)).toBe('AST-99999')
  })

  it('does not truncate beyond 5 digits', () => {
    expect(generateAssetTag(100000)).toBe('AST-100000')
  })
})

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe('slugify', () => {
  it('lowercases the input', () => {
    expect(slugify('HELLO')).toBe('hello')
  })

  it('replaces spaces with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(slugify('  Acme Corp  ')).toBe('acme-corp')
  })

  it('removes special characters', () => {
    expect(slugify('Acme Corp!')).toBe('acme-corp')
  })

  it('collapses multiple spaces into a single hyphen', () => {
    expect(slugify('foo   bar')).toBe('foo-bar')
  })

  it('collapses multiple hyphens', () => {
    expect(slugify('foo--bar')).toBe('foo-bar')
  })

  it('truncates to 60 characters', () => {
    const long = 'a'.repeat(80)
    expect(slugify(long)).toHaveLength(60)
  })
})

// ---------------------------------------------------------------------------
// formatCompactNumber
// ---------------------------------------------------------------------------

describe('formatCompactNumber', () => {
  it('formats thousands as K', () => {
    expect(formatCompactNumber(1200)).toBe('1.2K')
  })

  it('formats millions as M', () => {
    expect(formatCompactNumber(1000000)).toBe('1M')
  })

  it('formats small numbers as-is', () => {
    expect(formatCompactNumber(500)).toBe('500')
  })
})

// ---------------------------------------------------------------------------
// formatCompactCurrency
// ---------------------------------------------------------------------------

describe('formatCompactCurrency', () => {
  it('formats thousands as $K', () => {
    expect(formatCompactCurrency(12345)).toBe('$12.3K')
  })

  it('formats millions as $M', () => {
    expect(formatCompactCurrency(1000000)).toBe('$1M')
  })
})

// ---------------------------------------------------------------------------
// getInitials
// ---------------------------------------------------------------------------

describe('getInitials', () => {
  it('returns initials for a two-part name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('returns uppercase initials', () => {
    expect(getInitials('john doe')).toBe('JD')
  })

  it('returns only the first initial for a single name', () => {
    expect(getInitials('Alice')).toBe('A')
  })

  it('returns at most 2 characters for a long name', () => {
    expect(getInitials('John Michael Doe')).toBe('JM')
  })
})
