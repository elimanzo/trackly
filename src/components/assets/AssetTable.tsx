'use client'

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { deleteAsset } from '@/app/actions/assets'
import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import type { AssetWithRelations } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { canEdit } from '@/lib/utils/permissions'
import { useAuth } from '@/providers/AuthProvider'

interface AssetTableProps {
  assets: AssetWithRelations[]
}

export function AssetTable({ assets }: AssetTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { user } = useAuth()

  const canEditAssets = user ? canEdit(user.role) : false

  const columns: ColumnDef<AssetWithRelations>[] = [
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
          href={`/assets/${row.original.id}`}
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
          href={`/assets/${row.original.id}`}
          className="text-foreground font-medium hover:underline"
        >
          {row.getValue('name')}
        </Link>
      ),
    },
    {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.getValue('categoryName') ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'departmentName',
      header: 'Department',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.getValue('departmentName') ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <AssetStatusBadge status={row.original.status} />,
    },
    {
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
    {
      accessorKey: 'warrantyExpiry',
      header: 'Warranty',
      cell: ({ row }) => {
        const expiry = row.original.warrantyExpiry
        return (
          <span className="text-muted-foreground text-sm">{expiry ? formatDate(expiry) : '—'}</span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (!canEditAssets) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/assets/${row.original.id}`}>View details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/assets/${row.original.id}/edit`}>
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

  const table = useReactTable({
    data: assets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
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
                  colSpan={columns.length}
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
        onConfirm={() => {
          if (deleteId) deleteAsset(deleteId)
          setDeleteId(null)
        }}
      />
    </>
  )
}
