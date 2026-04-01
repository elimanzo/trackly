import type { CheckoutFormInput } from '@/lib/types'
import { computeAvailable } from '@/lib/utils/availability'

import type { CheckoutPorts } from './ports'

export type DomainResult = { error: string } | null

// ---------------------------------------------------------------------------
// checkoutAsset
// ---------------------------------------------------------------------------

export async function checkoutAsset(
  assetId: string,
  input: CheckoutFormInput,
  assignedByName: string,
  actorId: string,
  ports: CheckoutPorts
): Promise<DomainResult> {
  const asset = await ports.repo.getAsset(assetId)
  if (!asset) return { error: 'Asset not found.' }

  // Fast-path: reject immediately if obviously out of stock
  if (asset.isBulk) {
    const checkedOut = await ports.repo.sumCheckedOut(assetId)
    const available = computeAvailable(asset.quantity ?? 0, checkedOut)
    if (input.quantity > available) {
      return { error: `Only ${available} available in stock.` }
    }
  }

  // Insert first, then re-verify for bulk — catches concurrent checkouts that
  // both pass the pre-check above before either inserts
  const assignment = await ports.repo.insertAssignment({
    assetId,
    assignedToUserId: input.assignedToUserId,
    assignedToName: input.assignedToName,
    assignedById: actorId,
    assignedByName,
    quantity: input.quantity,
    departmentId: input.departmentId ?? null,
    locationId: input.locationId ?? null,
    expectedReturnAt: input.expectedReturnAt
      ? new Date(input.expectedReturnAt).toISOString()
      : null,
    notes: input.notes ?? null,
  })

  if (asset.isBulk) {
    const totalCheckedOut = await ports.repo.sumCheckedOut(assetId)
    if (totalCheckedOut > (asset.quantity ?? 0)) {
      await ports.repo.deleteAssignment(assignment.id)
      return { error: 'This item just went out of stock. Please try again.' }
    }
  }

  // Bulk assets stay 'active'; only serialized assets become 'checked_out'
  if (!asset.isBulk) {
    await ports.repo.setAssetStatus(assetId, 'checked_out')
  }

  await ports.audit.log({
    entityType: 'asset',
    entityId: assetId,
    entityName: asset.name,
    action: 'checked_out',
    changes: {
      assignedTo: { old: null, new: input.assignedToName },
      ...(asset.isBulk ? { quantity: { old: null, new: input.quantity } } : {}),
    },
  })

  return null
}

// ---------------------------------------------------------------------------
// returnSerializedAsset
// ---------------------------------------------------------------------------

export async function returnSerializedAsset(
  assetId: string,
  ports: CheckoutPorts
): Promise<DomainResult> {
  const [assignment, asset] = await Promise.all([
    ports.repo.getActiveAssignment(assetId),
    ports.repo.getAsset(assetId),
  ])

  await ports.repo.closeOpenAssignment(assetId)
  await ports.repo.setAssetStatus(assetId, 'active')

  await ports.audit.log({
    entityType: 'asset',
    entityId: assetId,
    entityName: asset?.name ?? 'Unknown asset',
    action: 'returned',
    changes: assignment?.assignedToName
      ? { assignedTo: { old: assignment.assignedToName, new: null } }
      : null,
  })

  return null
}

// ---------------------------------------------------------------------------
// returnBulkAssignment
// ---------------------------------------------------------------------------

export async function returnBulkAssignment(
  assignmentId: string,
  quantityToReturn: number,
  ports: CheckoutPorts
): Promise<DomainResult> {
  const row = await ports.repo.getAssignmentWithAsset(assignmentId)
  if (!row) return { error: 'Assignment not found.' }

  const remaining = row.quantity - quantityToReturn

  if (remaining <= 0) {
    await ports.repo.closeAssignmentById(assignmentId)
  } else {
    await ports.repo.updateAssignmentQuantity(assignmentId, remaining)
  }

  await ports.audit.log({
    entityType: 'asset',
    entityId: row.assetId,
    entityName: row.asset.name,
    action: 'returned',
    changes: {
      assignedTo: { old: row.assignedToName, new: null },
      quantity: { old: row.quantity, new: remaining <= 0 ? 0 : remaining },
    },
  })

  return null
}

// ---------------------------------------------------------------------------
// updateAssignment
// ---------------------------------------------------------------------------

export async function updateAssignment(
  assignmentId: string,
  assetId: string,
  isBulk: boolean,
  input: CheckoutFormInput,
  ports: CheckoutPorts
): Promise<DomainResult> {
  const asset = await ports.repo.getAsset(assetId)

  if (isBulk) {
    const checkedOutByOthers = await ports.repo.sumCheckedOut(assetId, assignmentId)
    const maxAllowed = computeAvailable(asset?.quantity ?? 0, checkedOutByOthers)
    if (input.quantity > maxAllowed) {
      return { error: `Only ${maxAllowed} available.` }
    }
  }

  await ports.repo.updateAssignmentFields(assignmentId, {
    assignedToName: input.assignedToName,
    quantity: input.quantity,
    departmentId: input.departmentId ?? null,
    locationId: input.locationId ?? null,
    expectedReturnAt: input.expectedReturnAt
      ? new Date(input.expectedReturnAt).toISOString()
      : null,
    notes: input.notes ?? null,
  })

  await ports.audit.log({
    entityType: 'asset',
    entityId: assetId,
    entityName: asset?.name ?? 'Unknown asset',
    action: 'updated',
    changes: { assignment: { old: null, new: input.assignedToName } },
  })

  return null
}
