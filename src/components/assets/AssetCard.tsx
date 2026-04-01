'use client'

import { useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { deleteAsset } from '@/app/actions/assets'
import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TypedAsset } from '@/lib/types'
import { formatCurrency } from '@/lib/utils/formatters'
import { canEdit } from '@/lib/utils/permissions'
import { useAuth } from '@/providers/AuthProvider'

interface AssetCardProps {
  asset: TypedAsset
}

export function AssetCard({ asset }: AssetCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canEditAssets = user ? canEdit(user.role) : false

  return (
    <>
      <Card className="group shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/assets/${asset.id}`} className="min-w-0 flex-1">
              <p className="text-foreground truncate font-semibold hover:underline">{asset.name}</p>
              <p className="text-muted-foreground font-mono text-xs">{asset.assetTag}</p>
            </Link>
            {canEditAssets && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`More options for ${asset.name}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/assets/${asset.id}/edit`}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <AssetStatusBadge status={asset.status} />
            {asset.purchaseCost != null && (
              <span className="text-muted-foreground text-xs">
                {formatCurrency(asset.purchaseCost)}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
            {asset.categoryName && (
              <span className="text-muted-foreground text-xs">{asset.categoryName}</span>
            )}
            {asset.departmentName && (
              <span className="text-muted-foreground text-xs">{asset.departmentName}</span>
            )}
          </div>

          {asset.assigneeSummary && (
            <p className="text-muted-foreground mt-2 truncate text-xs">
              Checked out to {asset.assigneeSummary}
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete asset?"
        description="This will permanently remove the asset. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await deleteAsset(asset.id)
          queryClient.invalidateQueries({ queryKey: ['assets'] })
          setConfirmDelete(false)
        }}
      />
    </>
  )
}
