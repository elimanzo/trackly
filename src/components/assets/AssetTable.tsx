'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type Updater,
  type VisibilityState,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, Pencil, SlidersHorizontal, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState } from 'react'

import { deleteAsset } from '@/app/actions/assets'
import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

const LS_KEY = 'asset-table-cols'

interface AssetTableProps {
  assets: TypedAsset[]
}

export function AssetTable({ assets }: AssetTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
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

  // Columns the org allows — only these appear in the toggle dropdown
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
      const stored = localStorage.getItem(LS_KEY)
      return stored ? (JSON.parse(stored) as VisibilityState) : {}
    } catch {
      return {}
    }
  })

  const updateVisibility = useCallback((updater: Updater<VisibilityState>) => {
    setColumnVisibility((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const allColumns: (ColumnDef<TypedAsset> | false)[] = [
    {
      accessorKey: 'assetTag',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Tag
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Cost
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const cost = row.original.purchaseCost
        return (
          <span className="text-muted-foreground text-sm">
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
      cell: ({ row }) => {
        if (!canEditAssets) return null
        return (
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
        )
      },
    },
  ]

  const columns = allColumns.filter(Boolean) as ColumnDef<TypedAsset>[]

  const table = useReactTable({
    data: assets,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: updateVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <div className="flex justify-end">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  No assets found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
    </>
  )
}
