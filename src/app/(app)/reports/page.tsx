'use client'

import { Download, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ASSET_STATUS_CONFIG } from '@/lib/constants'
import { type AssetFilters, useAssets } from '@/lib/hooks/useAssets'
import { useCategories } from '@/lib/hooks/useCategories'
import { useDepartments } from '@/lib/hooks/useDepartments'
import { ASSET_STATUSES } from '@/lib/types'
import { type ReportColumn, exportAssetsToCsv } from '@/lib/utils/csv-export'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

const LS_KEY = 'report-cols'

type ColDef = { key: ReportColumn; label: string; allowed: boolean }

export default function ReportsPage() {
  const [filters, setFilters] = useState<AssetFilters>({})
  const { data: assets, isLoading } = useAssets(filters)
  const { data: departments } = useDepartments()
  const { org } = useOrg()
  const deptLabel = org?.departmentLabel ?? 'Department'
  const { data: categories } = useCategories()
  const rc = org?.reportConfig ?? {}

  // Columns the org allows — the whitelist
  const allCols: ColDef[] = [
    { key: 'assignedTo', label: 'Assigned to', allowed: rc.showAssignedTo ?? true },
    { key: 'department', label: deptLabel, allowed: rc.showDepartment ?? true },
    { key: 'category', label: 'Category', allowed: rc.showCategory ?? true },
    { key: 'location', label: 'Location', allowed: rc.showLocation ?? false },
    { key: 'status', label: 'Status', allowed: rc.showStatus ?? true },
    { key: 'purchaseDate', label: 'Purchase date', allowed: rc.showPurchaseDate ?? false },
    { key: 'purchaseCost', label: 'Cost', allowed: rc.showPurchaseCost ?? false },
    { key: 'warrantyExpiry', label: 'Warranty', allowed: rc.showWarrantyExpiry ?? false },
    { key: 'vendor', label: 'Vendor', allowed: rc.showVendor ?? false },
    { key: 'notes', label: 'Notes', allowed: rc.showNotes ?? false },
  ]
  const allowedCols = allCols.filter((c) => c.allowed)

  // Per-user visibility — initialized from localStorage, defaults to all allowed visible
  const [visibleKeys, setVisibleKeys] = useState<Set<ReportColumn>>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ReportColumn[]
        return new Set(parsed.filter((k) => allowedCols.some((c) => c.key === k)))
      }
    } catch {}
    return new Set(allowedCols.map((c) => c.key))
  })

  function toggleCol(key: ReportColumn, checked: boolean) {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      checked ? next.add(key) : next.delete(key)
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })
  }

  if (isLoading) return <PageLoader />

  function handleExport() {
    exportAssetsToCsv(assets, 'asset-report.csv', visibleKeys)
    toast.success(`Exported ${assets.length} asset${assets.length !== 1 ? 's' : ''}`)
  }

  const visibleCols = allowedCols.filter((c) => visibleKeys.has(c.key))
  const colSpan = 2 + visibleCols.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Filter and export your asset data as CSV."
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allowedCols.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleKeys.has(col.key)}
                    onCheckedChange={(checked) => toggleCol(col.key, checked)}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleExport} disabled={assets.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV ({assets.length})
            </Button>
          </div>
        }
      />

      {/* Filter controls */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{deptLabel}</Label>
              <Select
                value={filters.departmentId ?? 'all'}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, departmentId: v === 'all' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`All ${deptLabel.toLowerCase()}s`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {deptLabel.toLowerCase()}s</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select
                value={filters.categoryId ?? 'all'}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, categoryId: v === 'all' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={filters.status ?? 'all'}
                onValueChange={(v) =>
                  setFilters((f) => ({
                    ...f,
                    status: v === 'all' ? '' : (v as AssetFilters['status']),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ASSET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ASSET_STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview table */}
      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Name</TableHead>
              {visibleCols.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  No assets match the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <span className="font-mono text-xs">{a.assetTag}</span>
                  </TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  {visibleCols.map((c) => (
                    <TableCell key={c.key}>
                      <span className="text-muted-foreground text-sm">
                        {c.key === 'assignedTo' && (a.currentAssignment?.assignedToName ?? '—')}
                        {c.key === 'department' && (a.departmentName ?? '—')}
                        {c.key === 'category' && (a.categoryName ?? '—')}
                        {c.key === 'location' && (a.locationName ?? '—')}
                        {c.key === 'status' && <AssetStatusBadge status={a.status} />}
                        {c.key === 'purchaseDate' && formatDate(a.purchaseDate)}
                        {c.key === 'purchaseCost' &&
                          (a.purchaseCost != null ? formatCurrency(a.purchaseCost) : '—')}
                        {c.key === 'warrantyExpiry' &&
                          (a.warrantyExpiry ? formatDate(a.warrantyExpiry) : '—')}
                        {c.key === 'vendor' && (a.vendorName ?? '—')}
                        {c.key === 'notes' && (a.notes ?? '—')}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
