import { format, formatDistanceToNow, parseISO } from 'date-fns'

import { ASSET_TAG_PREFIX } from '@/lib/constants'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy h:mm a')
  } catch {
    return '—'
  }
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return '—'
  }
}

/** Generate the next asset tag given a running count, e.g. "AST-00042" */
export function generateAssetTag(count: number): string {
  return `${ASSET_TAG_PREFIX}-${String(count).padStart(5, '0')}`
}

/** Auto-generate an org slug from a name */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

/** Format a number compactly (1200 → "1.2K") */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
}

/** Get user initials for avatar fallback */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
