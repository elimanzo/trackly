'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  type Column,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Package,
  Pencil,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState } from 'react'

import { deleteAsset } from '@/app/actions/assets'
import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createPolicy } from '@/lib/permissions'
import type { TypedAsset } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

const COLS_LS_KEY = 'asset-table-cols'
const DENSITY_LS_KEY = 'asset-table-density'

type Density = 'compact' | 'regular' | 'relaxed'
// padding-based density — overrides the base py-2 on TableCell via twMerge
const DENSITY_ROW: Record<Density, string> = {
  compact: 'py-1',
  regular: 'py-2',
  relaxed: 'py-3',
}

interface AssetTableProps {
  assets: TypedAsset[]
}

function SortableHeader({
  column,
  label,
  align = 'left',
}: {
  column: Column<TypedAsset>
  label: string
  align?: 'left' | 'right'
}) {
  const sorted = column.getIsSorted()
  const icon =
    sorted === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : sorted === 'desc' ? (
      <ArrowDown className="h-3.5 w-3.5" />
    ) : (
      <ArrowUpDown className="text-muted-foreground/50 h-3.5 w-3.5" />
    )
  return (
    <div className={cn('flex', align === 'right' && 'justify-end')}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'gap-1.5',
          align === 'left' ? '-ml-3' : '-mr-3',
          sorted !== false && 'bg-muted/50 text-foreground'
        )}
        onClick={() => column.toggleSorting(sorted === 'asc')}
      >
        {label}
        {icon}
      </Button>
    </div>
  )
}

export function AssetTable({ assets }: AssetTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [density, setDensity] = useState<Density>(() => {
    try {
      return (localStorage.getItem(DENSITY_LS_KEY) as Density) ?? 'regular'
    } catch {
      return 'regular'
    }
  })

  const { org, role, departmentIds, membership } = useOrg()
  const orgSlug = membership?.orgSlug ?? ''
  const queryClient = useQueryClient()
  const deptLabel = org?.departmentLabel ?? 'Department'
  const tc = org?.assetTableConfig ?? {}

  const showAssignedTo = tc.showAssignedTo ?? true
  const showDepartment = tc.showDepartment ?? true
  const showCategory = tc.showCategory ?? true
  const showLocation = tc.showLocation ?? true
  const showStatus = tc.showStatus ?? true
  const showPurchaseDate = tc.showPurchaseDate ?? false
  const showPurchaseCost = tc.showPurchaseCost ?? false
  const showWarrantyExpiry = tc.showWarrantyExpiry ?? false
  const showVendor = tc.showVendor ?? false

  const canEditAssets =
    role != null ? createPolicy({ role, departmentIds }).can('asset:create') : false

  const toggleableCols = [
    { id: 'assignedTo', label: 'Assigned to', allowed: showAssignedTo },
    { id: 'categoryName', label: 'Category', allowed: showCategory },
    { id: 'departmentName', label: deptLabel, allowed: showDepartment },
    { id: 'status', label: 'Status', allowed: showStatus },
    { id: 'locationName', label: 'Location', allowed: showLocation },
    { id: 'purchaseDate', label: 'Purchase date', allowed: showPurchaseDate },
    { id: 'purchaseCost', label: 'Cost', allowed: showPurchaseCost },
    { id: 'warrantyExpiry', label: 'Warranty', allowed: showWarrantyExpiry },
    { id: 'vendorName', label: 'Vendor', allowed: showVendor },
  ].filter((c) => c.allowed)

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const stored = localStorage.getItem(COLS_LS_KEY)
      return stored ? (JSON.parse(stored) as VisibilityState) : {}
    } catch {
      return {}
    }
  })

  const updateVisibility = useCallback((updater: Updater<VisibilityState>) => {
    setColumnVisibility((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        localStorage.setItem(COLS_LS_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  function setDensityPersisted(d: Density) {
    setDensity(d)
    try {
      localStorage.setItem(DENSITY_LS_KEY, d)
    } catch {}
  }

  const allColumns: (ColumnDef<TypedAsset> | false)[] = [
    canEditAssets && {
      id: 'select',
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label={`Select ${row.original.name}`}
        />
      ),
    },
    {
      accessorKey: 'assetTag',
      header: ({ column }) => <SortableHeader column={column} label="Tag" />,
      cell: ({ row }) => (
        <Link
          href={`/orgs/${orgSlug}/assets/${row.original.id}`}
          className="text-primary font-mono text-xs hover:underline"
        >
          {row.getValue('assetTag')}
        </Link>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => (
        <Link
          href={`/orgs/${orgSlug}/assets/${row.original.id}`}
          className="text-foreground font-medium hover:underline"
        >
          {row.getValue('name')}
        </Link>
      ),
    },
    showAssignedTo && {
      id: 'assignedTo',
      header: 'Assigned to',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.assigneeSummary ?? '—'}</span>
      ),
    },
    showCategory && {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.getValue('categoryName') ?? '—'}</span>
      ),
    },
    showDepartment && {
      accessorKey: 'departmentName',
      header: deptLabel,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.getValue('departmentName') ?? '—'}
        </span>
      ),
    },
    showStatus && {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const asset = row.original
        if (asset.ui.statusBadgeText) {
          return (
            <Badge variant="secondary" className="text-xs">
              {asset.ui.statusBadgeText}
            </Badge>
          )
        }
        return <AssetStatusBadge status={asset.status} />
      },
    },
    showLocation && {
      accessorKey: 'locationName',
      header: 'Location',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.getValue('locationName') ?? '—'}</span>
      ),
    },
    showPurchaseDate && {
      accessorKey: 'purchaseDate',
      header: 'Purchase date',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.purchaseDate)}
        </span>
      ),
    },
    showPurchaseCost && {
      accessorKey: 'purchaseCost',
      header: ({ column }) => <SortableHeader column={column} label="Cost" align="right" />,
      cell: ({ row }) => {
        const cost = row.original.purchaseCost
        return (
          <span className="text-muted-foreground block text-right font-mono text-sm tabular-nums">
            {cost != null ? formatCurrency(cost) : '—'}
          </span>
        )
      },
    },
    showWarrantyExpiry && {
      accessorKey: 'warrantyExpiry',
      header: 'Warranty',
      cell: ({ row }) => {
        const expiry = row.original.warrantyExpiry
        return (
          <span className="text-muted-foreground text-sm">{expiry ? formatDate(expiry) : '—'}</span>
        )
      },
    },
    showVendor && {
      accessorKey: 'vendorName',
      header: 'Vendor',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.vendorName ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        if (!canEditAssets) return null
        return (
          <div className="flex justify-end opacity-0 transition-opacity duration-150 will-change-[opacity] group-hover:opacity-100 focus-within:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`More options for ${row.original.name}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/orgs/${orgSlug}/assets/${row.original.id}`}>View details</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/orgs/${orgSlug}/assets/${row.original.id}/edit`}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteId(row.original.id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const columns = allColumns.filter(Boolean) as ColumnDef<TypedAsset>[]

  const table = useReactTable({
    data: assets,
    columns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: updateVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: canEditAssets,
  })

  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length
  const hiddenColCount = toggleableCols.filter((col) => columnVisibility[col.id] === false).length

  return (
    <>
      {/* Bulk action bar — slides in when rows selected */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          selectedCount > 0 ? 'mb-2 max-h-16 opacity-100' : 'mb-0 max-h-0 opacity-0'
        )}
      >
        <div className="bg-muted/50 flex items-center gap-3 rounded-md border px-4 py-2">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'asset' : 'assets'} selected
          </span>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground ml-auto"
            onClick={() => table.resetRowSelection()}
          >
            Clear selection
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {/* Density toggle */}
        <div className="flex overflow-hidden rounded-md border">
          {(['compact', 'regular', 'relaxed'] as Density[]).map((d) => (
            <button
              key={d}
              onClick={() => setDensityPersisted(d)}
              className={cn(
                'cursor-pointer border-r px-2.5 py-1 text-xs font-medium transition-colors last:border-r-0',
                density === d
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              {d === 'compact' ? 'S' : d === 'regular' ? 'M' : 'L'}
            </button>
          ))}
        </div>

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Columns
              {hiddenColCount > 0 && (
                <Badge variant="secondary" className="h-4 min-w-4 px-1 text-xs">
                  {hiddenColCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {toggleableCols.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={columnVisibility[col.id] !== false}
                onCheckedChange={(checked) =>
                  updateVisibility((prev) => ({ ...prev, [col.id]: checked }))
                }
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-muted-foreground justify-center text-xs"
              onClick={() => updateVisibility({})}
            >
              Reset to defaults
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border shadow-sm">
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent [&>th]:shadow-[0_1px_0_0_hsl(var(--border))]"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.id === 'assetTag' &&
                        'bg-background after:bg-border sticky left-0 z-20 after:absolute after:inset-y-0 after:right-0 after:w-px'
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="p-0">
                  <EmptyState
                    icon={Package}
                    title="No assets found"
                    description="Try adjusting your filters or add your first asset."
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className="group animate-in fade-in-0 duration-300"
                  style={{
                    animationDelay: `${Math.min(index * 20, 300)}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        DENSITY_ROW[density],
                        cell.column.id === 'assetTag' && [
                          'sticky left-0 z-10',
                          'after:bg-border after:absolute after:inset-y-0 after:right-0 after:w-px',
                          row.getIsSelected() ? 'bg-muted' : 'bg-background',
                        ]
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Single delete */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete asset?"
        description="This will permanently remove the asset. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deleteId) {
            await deleteAsset(orgSlug, deleteId)
            queryClient.invalidateQueries({ queryKey: ['assets'] })
          }
          setDeleteId(null)
        }}
      />

      {/* Bulk delete */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setBulkDeleteOpen(false)
        }}
        title={`Delete ${selectedCount} ${selectedCount === 1 ? 'asset' : 'assets'}?`}
        description="This will permanently remove all selected assets. This action cannot be undone."
        confirmLabel="Delete all"
        destructive
        onConfirm={async () => {
          await Promise.all(selectedRows.map((row) => deleteAsset(orgSlug, row.original.id)))
          queryClient.invalidateQueries({ queryKey: ['assets'] })
          table.resetRowSelection()
          setBulkDeleteOpen(false)
        }}
      />
    </>
  )
}
