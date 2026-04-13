import { z } from 'zod'

// ---------------------------------------------------------------------------
// Branded / opaque ID types
// ---------------------------------------------------------------------------

declare const __brand: unique symbol
type Brand<T, B> = T & { [__brand]: B }

export type OrgId = Brand<string, 'OrgId'>
export type AssetId = Brand<string, 'AssetId'>
export type UserId = Brand<string, 'UserId'>
export type DeptId = Brand<string, 'DeptId'>
export type EventId = Brand<string, 'EventId'>
export type AssignmentId = Brand<string, 'AssignmentId'>

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
})

export type Pagination = z.infer<typeof PaginationSchema>

export type PaginatedResult<T> = {
  readonly data: readonly T[]
  readonly pagination: Pagination
}

// ---------------------------------------------------------------------------
// API response wrapper (for Phase 2 compatibility)
// ---------------------------------------------------------------------------

export type ApiSuccess<T> = { readonly success: true; readonly data: T }
export type ApiError = { readonly success: false; readonly error: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ---------------------------------------------------------------------------
// Sort / filter helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Async state discriminated union
// ---------------------------------------------------------------------------

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T }

// ---------------------------------------------------------------------------
// Sort / filter helpers
// ---------------------------------------------------------------------------

export type SortDirection = 'asc' | 'desc'

export type SortState = {
  field: string
  direction: SortDirection
}
