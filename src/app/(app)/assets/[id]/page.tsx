'use client'

import { ArrowLeft, LogIn, LogOut, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { use, useState } from 'react'
import { toast } from 'sonner'

import { deleteAsset, restockAsset, returnAsset, returnBulkAssignment } from '@/app/actions/assets'
import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { CheckoutModal } from '@/components/assets/CheckoutModal'
import { EditAssignmentModal } from '@/components/assets/EditAssignmentModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAsset } from '@/lib/hooks/useAssets'
import type { AssetAssignment } from '@/lib/types'
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
  const [activeTab, setActiveTab] = useState('details')
  const [restockOpen, setRestockOpen] = useState(false)
  const [returnAssignment, setReturnAssignment] = useState<AssetAssignment | null>(null)
  const [editAssignment, setEditAssignment] = useState<AssetAssignment | null>(null)

  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  if (!asset) return notFound()

  const canEditAssets = user ? canEdit(user.role) : false
  const available = asset.isBulk ? (asset.quantity ?? 0) - asset.quantityCheckedOut : null
  const canCheckOut = asset.isBulk ? (available ?? 0) > 0 : asset.status !== 'checked_out'

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
            {canEditAssets && canCheckOut && (
              <Button variant="outline" size="sm" onClick={() => setCheckoutOpen(true)}>
                <LogOut className="mr-1.5 h-4 w-4" />
                Check out
              </Button>
            )}
            {canEditAssets && !asset.isBulk && asset.status === 'checked_out' && (
              <Button variant="outline" size="sm" onClick={handleReturn}>
                <LogIn className="mr-1.5 h-4 w-4" />
                Return
              </Button>
            )}
            {canEditAssets && asset.isBulk && (
              <Button variant="outline" size="sm" onClick={() => setRestockOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Restock
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
              {asset.isBulk ? (
                <Badge variant="secondary">
                  {available} of {asset.quantity} available
                </Badge>
              ) : (
                <AssetStatusBadge status={asset.status} />
              )}
              {asset.categoryName && (
                <Badge variant="outline" className="text-xs">
                  {asset.categoryName}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="assignment">
              {asset.isBulk ? `Checked out (${asset.activeAssignments.length})` : 'Assignment'}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Details tab */}
          <TabsContent value="details" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {asset.isBulk && (
                <Card className="shadow-sm sm:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Stock summary</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-8">
                    <div>
                      <p className="text-muted-foreground text-xs">Total stock</p>
                      <p className="text-foreground text-2xl font-bold">{asset.quantity ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Checked out</p>
                      <p className="text-2xl font-bold text-amber-500">
                        {asset.quantityCheckedOut}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Available</p>
                      <p className="text-2xl font-bold text-green-500">{available}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
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
            {asset.isBulk ? (
              asset.activeAssignments.length === 0 ? (
                <div className="text-muted-foreground rounded-xl border py-12 text-center text-sm">
                  No items currently checked out.
                </div>
              ) : (
                <div className="space-y-3">
                  {asset.activeAssignments.map((a) => (
                    <Card key={a.id} className="shadow-sm">
                      <CardContent className="flex items-start justify-between gap-4 pt-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground font-medium">{a.assignedToName}</span>
                            <Badge variant="secondary">{a.quantity}×</Badge>
                          </div>
                          <div className="text-muted-foreground grid grid-cols-2 gap-x-6 gap-y-1">
                            <span>Assigned by: {a.assignedByName}</span>
                            <span>Checked out: {formatDate(a.assignedAt)}</span>
                            {a.departmentName && (
                              <span>
                                {deptLabel}: {a.departmentName}
                              </span>
                            )}
                            {a.locationName && <span>Location: {a.locationName}</span>}
                            {a.expectedReturnAt && (
                              <span>Expected return: {formatDate(a.expectedReturnAt)}</span>
                            )}
                            {a.notes && <span className="col-span-2">Notes: {a.notes}</span>}
                          </div>
                        </div>
                        {canEditAssets && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditAssignment(a)}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReturnAssignment(a)}
                            >
                              <LogIn className="mr-1.5 h-3.5 w-3.5" />
                              Return
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : asset.currentAssignment ? (
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold">Current assignment</CardTitle>
                  {canEditAssets && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditAssignment(asset.currentAssignment)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
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
                  {asset.currentAssignment.departmentName && (
                    <DetailRow label={deptLabel} value={asset.currentAssignment.departmentName} />
                  )}
                  {asset.currentAssignment.locationName && (
                    <DetailRow label="Location" value={asset.currentAssignment.locationName} />
                  )}
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

          {/* History tab */}
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

      {restockOpen && (
        <RestockModal
          assetName={asset.name}
          open={restockOpen}
          onOpenChange={setRestockOpen}
          onConfirm={async (qty) => {
            const result = await restockAsset(asset.id, qty)
            if (result?.error) {
              toast.error(result.error)
            } else {
              toast.success(`Added ${qty} to stock`)
              refresh()
            }
            setRestockOpen(false)
          }}
        />
      )}

      {editAssignment && (
        <EditAssignmentModal
          assignment={editAssignment}
          assetId={asset.id}
          isBulk={asset.isBulk}
          maxQuantity={
            asset.isBulk
              ? (asset.quantity ?? 0) - asset.quantityCheckedOut + editAssignment.quantity
              : undefined
          }
          open={!!editAssignment}
          onOpenChange={(open) => {
            if (!open) setEditAssignment(null)
          }}
          onSuccess={() => {
            setEditAssignment(null)
            refresh()
          }}
        />
      )}

      {returnAssignment && (
        <BulkReturnModal
          assignment={returnAssignment}
          open={!!returnAssignment}
          onOpenChange={(open) => {
            if (!open) setReturnAssignment(null)
          }}
          onConfirm={async (qty) => {
            const result = await returnBulkAssignment(returnAssignment.id, qty)
            if (result?.error) {
              toast.error(result.error)
            } else {
              toast.success(`${qty} item${qty !== 1 ? 's' : ''} returned`)
              setReturnAssignment(null)
              refresh()
            }
          }}
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

function RestockModal({
  assetName,
  open,
  onOpenChange,
  onConfirm,
}: {
  assetName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (qty: number) => void
}) {
  const [qty, setQty] = useState(1)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Restock</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{assetName}</p>
        <div className="space-y-1.5">
          <Label>Quantity to add</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(qty)}>Add to stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BulkReturnModal({
  assignment,
  open,
  onOpenChange,
  onConfirm,
}: {
  assignment: AssetAssignment
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (qty: number) => void
}) {
  const [qty, setQty] = useState(assignment.quantity)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Return items</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {assignment.assignedToName} has <strong>{assignment.quantity}</strong> checked out.
        </p>
        <div className="space-y-1.5">
          <Label>Quantity to return</Label>
          <Input
            type="number"
            min={1}
            max={assignment.quantity}
            step={1}
            value={qty}
            onChange={(e) =>
              setQty(Math.min(assignment.quantity, Math.max(1, Number(e.target.value))))
            }
          />
          {qty < assignment.quantity && (
            <p className="text-muted-foreground text-xs">
              {assignment.quantity - qty} will remain checked out to {assignment.assignedToName}.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(qty)}>Confirm return</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
