'use client'

import { ArrowLeft, LogIn, LogOut, Loader2, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { use, useState } from 'react'

import { deleteAsset, returnAsset } from '@/app/actions/assets'
import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { CheckoutModal } from '@/components/assets/CheckoutModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAsset } from '@/lib/hooks/useAssets'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { canEdit } from '@/lib/utils/permissions'
import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

interface AssetDetailPageProps {
  params: Promise<{ id: string }>
}

export default function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { id } = use(params)
  const { data: asset, isLoading, refresh } = useAsset(id)
  const { user } = useAuth()
  const { org } = useOrg()
  const deptLabel = org?.departmentLabel ?? 'Department'
  const router = useRouter()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  if (!asset) return notFound()

  const canEditAssets = user ? canEdit(user.role) : false

  async function handleReturn() {
    await returnAsset(asset!.id)
    refresh()
  }

  async function handleDelete() {
    await deleteAsset(asset!.id)
    router.push('/assets')
  }

  return (
    <>
      <div className="space-y-6">
        {/* Back + actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/assets">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Assets
            </Link>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {canEditAssets && asset.status !== 'checked_out' && (
              <Button variant="outline" size="sm" onClick={() => setCheckoutOpen(true)}>
                <LogOut className="mr-1.5 h-4 w-4" />
                Check out
              </Button>
            )}
            {canEditAssets && asset.status === 'checked_out' && (
              <Button variant="outline" size="sm" onClick={handleReturn}>
                <LogIn className="mr-1.5 h-4 w-4" />
                Return
              </Button>
            )}
            {canEditAssets && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/assets/${asset.id}/edit`}>
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-foreground text-2xl font-bold">{asset.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground font-mono text-sm">{asset.assetTag}</span>
              <AssetStatusBadge status={asset.status} />
              {asset.categoryName && (
                <Badge variant="outline" className="text-xs">
                  {asset.categoryName}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="assignment">Assignment</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Details tab */}
          <TabsContent value="details" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Asset info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label={deptLabel} value={asset.departmentName ?? '—'} />
                  <DetailRow label="Category" value={asset.categoryName ?? '—'} />
                  <DetailRow label="Location" value={asset.locationName ?? '—'} />
                  <DetailRow label="Vendor" value={asset.vendorName ?? '—'} />
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Purchase info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow
                    label="Purchase date"
                    value={asset.purchaseDate ? formatDate(asset.purchaseDate) : '—'}
                  />
                  <DetailRow
                    label="Cost"
                    value={asset.purchaseCost != null ? formatCurrency(asset.purchaseCost) : '—'}
                  />
                  <DetailRow
                    label="Warranty expiry"
                    value={asset.warrantyExpiry ? formatDate(asset.warrantyExpiry) : '—'}
                  />
                </CardContent>
              </Card>
              {asset.notes && (
                <Card className="shadow-sm sm:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm whitespace-pre-line">
                      {asset.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Assignment tab */}
          <TabsContent value="assignment" className="mt-4">
            {asset.currentAssignment ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Current assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label="Assigned to" value={asset.currentAssignment.assignedToName} />
                  <DetailRow label="Assigned by" value={asset.currentAssignment.assignedByName} />
                  <DetailRow
                    label="Assigned on"
                    value={formatDate(asset.currentAssignment.assignedAt)}
                  />
                  <DetailRow
                    label="Expected return"
                    value={
                      asset.currentAssignment.expectedReturnAt
                        ? formatDate(asset.currentAssignment.expectedReturnAt)
                        : '—'
                    }
                  />
                  {asset.currentAssignment.notes && (
                    <DetailRow label="Notes" value={asset.currentAssignment.notes} />
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-muted-foreground rounded-xl border py-12 text-center text-sm">
                This asset is not currently checked out.
              </div>
            )}
          </TabsContent>

          {/* History tab — audit log wiring coming in a later step */}
          <TabsContent value="history" className="mt-4">
            <div className="text-muted-foreground rounded-xl border py-12 text-center text-sm">
              Activity history coming soon.
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {checkoutOpen && (
        <CheckoutModal
          asset={asset}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          onSuccess={refresh}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete asset?"
        description={`"${asset.name}" will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  )
}
