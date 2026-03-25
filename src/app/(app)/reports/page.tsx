'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
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

export default function ReportsPage() {
  const [filters, setFilters] = useState<AssetFilters>({})
  const { data: assets } = useAssets(filters)
  const { data: departments } = useDepartments()
  const { data: categories } = useCategories()

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
              <Label className="text-xs">Department</Label>
              <Select
                value={filters.departmentId ?? 'all'}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, departmentId: v === 'all' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
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
      <div className="rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Warranty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-12 text-center text-sm">
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
                  <TableCell>
                    <span className="text-muted-foreground text-sm">{a.departmentName ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">{a.categoryName ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <AssetStatusBadge status={a.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {a.purchaseCost != null ? formatCurrency(a.purchaseCost) : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {a.warrantyExpiry ? formatDate(a.warrantyExpiry) : '—'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
