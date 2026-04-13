/**
 * Strip a raw prefix string to uppercase alphanumeric characters only.
 * "laptop 15" → "LAPTOP15", "IT-DEPT" → "ITDEPT"
 */
export function sanitizePrefix(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Given a sanitized prefix and a list of existing asset tags, return the
 * next tag in the sequence.
 *
 * Finds the highest numeric suffix among tags matching `${prefix}-{digits}`,
 * then returns `${prefix}-{max+1}` zero-padded to 4 characters.
 *
 * NOTE: This is a suggestion, not a reservation. Two concurrent users can
 * receive the same suggested tag; the unique constraint on `asset_tag`
 * surfaces this as a user-friendly error on insert.
 */
export function nextTagInSequence(sanitizedPrefix: string, existingTags: string[]): string {
  const pattern = new RegExp(`^${sanitizedPrefix}-(\\d+)$`, 'i')
  let max = 0
  for (const tag of existingTags) {
    const match = pattern.exec(tag)
    if (match) {
      const n = parseInt(match[1]!, 10)
      if (n > max) max = n
    }
  }
  return `${sanitizedPrefix}-${String(max + 1).padStart(4, '0')}`
}

/**
 * Split a tag like "LAPTOP-0042" into its prefix and suffix parts.
 * Falls back to `{ prefix: tag, suffix: '0001' }` when there is no `-`.
 */
export function parseTagParts(tag: string): { prefix: string; suffix: string } {
  const idx = tag.lastIndexOf('-')
  if (idx > 0) return { prefix: tag.slice(0, idx), suffix: tag.slice(idx + 1) }
  return { prefix: tag, suffix: '0001' }
}
