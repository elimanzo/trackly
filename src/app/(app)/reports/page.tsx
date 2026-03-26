'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { exportAssetsToCsv } from '@/lib/utils/csv-export'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

export default function ReportsPage() {
  const [filters, setFilters] = useState<AssetFilters>({})
  const { data: assets, isLoading } = useAssets(filters)
  const { data: departments } = useDepartments()
  const { org } = useOrg()
  const deptLabel = org?.departmentLabel ?? 'Department'
  const { data: categories } = useCategories()
  const rc = org?.reportConfig ?? {}
  const showAssignedTo = rc.showAssignedTo ?? true
  const showDepartment = rc.showDepartment ?? true
  const showCategory = rc.showCategory ?? true
  const showLocation = rc.showLocation ?? false
  const showStatus = rc.showStatus ?? true
  const showPurchaseDate = rc.showPurchaseDate ?? false
  const showPurchaseCost = rc.showPurchaseCost ?? false
  const showWarrantyExpiry = rc.showWarrantyExpiry ?? false
  const showVendor = rc.showVendor ?? false

  if (isLoading) return <PageLoader />

  function handleExport() {
    exportAssetsToCsv(assets, 'asset-report.csv')
    toast.success(`Exported ${assets.length} asset${assets.length !== 1 ? 's' : ''}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Filter and export your asset data as CSV."
        action={
          <Button onClick={handleExport} disabled={assets.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV ({assets.length})
          </Button>
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
              {showAssignedTo && <TableHead>Assigned to</TableHead>}
              {showDepartment && <TableHead>{deptLabel}</TableHead>}
              {showCategory && <TableHead>Category</TableHead>}
              {showLocation && <TableHead>Location</TableHead>}
              {showStatus && <TableHead>Status</TableHead>}
              {showPurchaseDate && <TableHead>Purchase date</TableHead>}
              {showPurchaseCost && <TableHead>Cost</TableHead>}
              {showWarrantyExpiry && <TableHead>Warranty</TableHead>}
              {showVendor && <TableHead>Vendor</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    2 +
                    [
                      showAssignedTo,
                      showDepartment,
                      showCategory,
                      showLocation,
                      showStatus,
                      showPurchaseDate,
                      showPurchaseCost,
                      showWarrantyExpiry,
                      showVendor,
                    ].filter(Boolean).length
                  }
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
                  {showAssignedTo && (
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {a.currentAssignment?.assignedToName ?? '—'}
                      </span>
                    </TableCell>
                  )}
                  {showDepartment && (
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {a.departmentName ?? '—'}
                      </span>
                    </TableCell>
                  )}
                  {showCategory && (
                    <TableCell>
                      <span className="text-muted-foreground text-sm">{a.categoryName ?? '—'}</span>
                    </TableCell>
                  )}
                  {showLocation && (
                    <TableCell>
                      <span className="text-muted-foreground text-sm">{a.locationName ?? '—'}</span>
                    </TableCell>
                  )}
                  {showStatus && (
                    <TableCell>
                      <AssetStatusBadge status={a.status} />
                    </TableCell>
                  )}
                  {showPurchaseDate && (
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {formatDate(a.purchaseDate)}
                      </span>
                    </TableCell>
                  )}
                  {showPurchaseCost && (
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {a.purchaseCost != null ? formatCurrency(a.purchaseCost) : '—'}
                      </span>
                    </TableCell>
                  )}
                  {showWarrantyExpiry && (
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {a.warrantyExpiry ? formatDate(a.warrantyExpiry) : '—'}
                      </span>
                    </TableCell>
                  )}
                  {showVendor && (
                    <TableCell>
                      <span className="text-muted-foreground text-sm">{a.vendorName ?? '—'}</span>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
