/**
 * How many units of a bulk asset are available for checkout.
 * Clamps to 0 so the result is never negative.
 */
export function computeAvailable(totalQuantity: number, checkedOut: number): number {
  return Math.max(0, totalQuantity - checkedOut)
}

/**
 * Maximum units that can be requested when editing an existing assignment.
 * = available units + what this assignment already holds.
 */
export function computeMaxForEdit(
  totalQuantity: number,
  checkedOut: number,
  assignmentQuantity: number
): number {
  return Math.max(0, totalQuantity - checkedOut + assignmentQuantity)
}
