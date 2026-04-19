'use client'

import { Download, FileBarChart, Loader2, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ASSET_STATUS_CONFIG } from '@/lib/constants'
import { type AssetFilters, fetchAllAssetsForExport, useAssets } from '@/lib/hooks/useAssets'
import { useCategories } from '@/lib/hooks/useCategories'
import { useDepartments } from '@/lib/hooks/useDepartments'
import { ASSET_STATUSES } from '@/lib/types'
import { cn } from '@/lib/utils'
import { type ReportColumn, exportAssetsToCsv } from '@/lib/utils/csv-export'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

const LS_KEY = 'report-cols'

type ColDef = { key: ReportColumn; label: string; allowed: boolean }

export default function ReportsPage() {
  const [filters, setFilters] = useState<AssetFilters>({})
  const [exporting, setExporting] = useState(false)
  const { data: assets, isLoading } = useAssets(filters)
  const { data: departments } = useDepartments()
  const { org, role, departmentIds } = useOrg()
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

  if (isLoading)
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Filter and export your asset data as CSV." />
        <div className="overflow-hidden rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-3.5 w-20 font-mono" />
                  </TableCell>
                  <TableCell>
                    <Skeleton
                      className={cn('h-3.5', i % 3 === 0 ? 'w-40' : i % 3 === 1 ? 'w-32' : 'w-48')}
                    />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className={cn('h-3.5', i % 2 === 0 ? 'w-24' : 'w-20')} />
                  </TableCell>
                  <TableCell>
                    <Skeleton className={cn('h-3.5', i % 2 === 0 ? 'w-28' : 'w-20')} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )

  async function handleExport() {
    if (!org?.id) return
    setExporting(true)
    try {
      const all = await fetchAllAssetsForExport(org.id, role ?? null, departmentIds, filters)
      exportAssetsToCsv(all, 'asset-report.csv', visibleKeys)
      toast.success(`Exported ${all.length} asset${all.length !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const activeFilterCount = [filters.departmentId, filters.categoryId, filters.status].filter(
    Boolean
  ).length

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
                  {allowedCols.filter((c) => !visibleKeys.has(c.key)).length > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-xs">
                      {allowedCols.filter((c) => !visibleKeys.has(c.key)).length}
                    </Badge>
                  )}
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

            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </div>
        }
      />

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.departmentId ?? 'all'}
          onValueChange={(v) => setFilters((f) => ({ ...f, departmentId: v === 'all' ? '' : v }))}
        >
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm">
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

        <Select
          value={filters.categoryId ?? 'all'}
          onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v === 'all' ? '' : v }))}
        >
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm">
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

        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              status: v === 'all' ? '' : (v as AssetFilters['status']),
            }))
          }
        >
          <SelectTrigger className="h-8 w-auto min-w-[130px] text-sm">
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

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-sm"
            onClick={() => setFilters({})}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Preview table */}
      <div className="overflow-hidden rounded-md border shadow-sm">
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10">
            <TableRow className="hover:bg-transparent [&>th]:shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableHead>Tag</TableHead>
              <TableHead>Name</TableHead>
              {visibleCols.map((c) => (
                <TableHead key={c.key} className={cn(c.key === 'purchaseCost' && 'text-right')}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colSpan} className="p-0">
                  <EmptyState
                    icon={FileBarChart}
                    title="No assets match the filters"
                    description="Try adjusting the department, category, or status filters above."
                  />
                </TableCell>
              </TableRow>
            ) : (
              assets.map((a, index) => (
                <TableRow
                  key={a.id}
                  className="animate-in fade-in-0 duration-300"
                  style={{
                    animationDelay: `${Math.min(index * 20, 300)}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <TableCell>
                    <span className="font-mono text-xs">{a.assetTag}</span>
                  </TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  {visibleCols.map((c) => (
                    <TableCell key={c.key} className={cn(c.key === 'purchaseCost' && 'text-right')}>
                      <span
                        className={cn(
                          'text-muted-foreground text-sm',
                          c.key === 'purchaseCost' && 'font-mono tabular-nums'
                        )}
                      >
                        {c.key === 'assignedTo' && (a.assigneeSummary ?? '—')}
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
