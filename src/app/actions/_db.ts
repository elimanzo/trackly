// Named Postgres error codes — use these instead of magic strings
export const PG = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
} as const

/**
 * Maps a Postgres error code to a user-friendly message.
 * Pass `overrides` to customise messages for specific codes.
 */
export function mapDbError(
  error: { code: string },
  overrides?: Partial<Record<keyof typeof PG, string>>
): string {
  switch (error.code) {
    case PG.UNIQUE_VIOLATION:
      return overrides?.UNIQUE_VIOLATION ?? 'A duplicate value already exists.'
    case PG.FOREIGN_KEY_VIOLATION:
      return (
        overrides?.FOREIGN_KEY_VIOLATION ?? 'Invalid reference — a selected value no longer exists.'
      )
    case PG.NOT_NULL_VIOLATION:
      return overrides?.NOT_NULL_VIOLATION ?? 'A required field is missing.'
    default:
      return 'Unexpected database error'
  }
}
