import type { AssetWithRelations } from '@/lib/types'
import { ASSET_STATUS_LABELS } from '@/lib/types/asset'

import { formatCurrency, formatDate } from './formatters'

function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function rowToCsv(values: (string | null | undefined)[]): string {
  return values.map(escapeCsvValue).join(',')
}

export function exportAssetsToCsv(assets: AssetWithRelations[], filename = 'assets.csv'): void {
  const headers = [
    'Asset Tag',
    'Name',
    'Category',
    'Department',
    'Location',
    'Status',
    'Assigned To',
    'Purchase Date',
    'Purchase Cost',
    'Warranty Expiry',
    'Vendor',
    'Notes',
  ]

  const rows = assets.map((a) =>
    rowToCsv([
      a.assetTag,
      a.name,
      a.categoryName,
      a.departmentName,
      a.locationName,
      ASSET_STATUS_LABELS[a.status],
      a.currentAssignment?.assignedToName ?? null,
      formatDate(a.purchaseDate),
      a.purchaseCost !== null ? formatCurrency(a.purchaseCost) : null,
      formatDate(a.warrantyExpiry),
      a.vendorName,
      a.notes,
    ])
  )

  const csv = [rowToCsv(headers), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
