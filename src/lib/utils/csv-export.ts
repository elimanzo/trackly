import type { AssetWithRelations } from '@/lib/types'
import { ASSET_STATUS_LABELS } from '@/lib/types/asset'

import { formatCurrency, formatDate } from './formatters'

export type ReportColumn =
  | 'assignedTo'
  | 'department'
  | 'category'
  | 'location'
  | 'status'
  | 'purchaseDate'
  | 'purchaseCost'
  | 'warrantyExpiry'
  | 'vendor'
  | 'notes'

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

const COLUMN_DEFS: {
  key: ReportColumn
  header: string
  value: (a: AssetWithRelations) => string | null | undefined
}[] = [
  { key: 'assignedTo', header: 'Assigned To', value: (a) => a.currentAssignment?.assignedToName },
  { key: 'department', header: 'Department', value: (a) => a.departmentName },
  { key: 'category', header: 'Category', value: (a) => a.categoryName },
  { key: 'location', header: 'Location', value: (a) => a.locationName },
  { key: 'status', header: 'Status', value: (a) => ASSET_STATUS_LABELS[a.status] },
  { key: 'purchaseDate', header: 'Purchase Date', value: (a) => formatDate(a.purchaseDate) },
  {
    key: 'purchaseCost',
    header: 'Purchase Cost',
    value: (a) => (a.purchaseCost != null ? formatCurrency(a.purchaseCost) : null),
  },
  {
    key: 'warrantyExpiry',
    header: 'Warranty Expiry',
    value: (a) => formatDate(a.warrantyExpiry),
  },
  { key: 'vendor', header: 'Vendor', value: (a) => a.vendorName },
  { key: 'notes', header: 'Notes', value: (a) => a.notes },
]

export function exportAssetsToCsv(
  assets: AssetWithRelations[],
  filename = 'assets.csv',
  visibleColumns?: Set<ReportColumn>
): void {
  const activeCols = visibleColumns
    ? COLUMN_DEFS.filter((c) => visibleColumns.has(c.key))
    : COLUMN_DEFS

  const headers = ['Asset Tag', 'Name', ...activeCols.map((c) => c.header)]
  const rows = assets.map((a) =>
    rowToCsv([a.assetTag, a.name, ...activeCols.map((c) => c.value(a))])
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
