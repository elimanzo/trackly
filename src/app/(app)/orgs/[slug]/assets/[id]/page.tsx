'use client'

import { ArrowLeft, LogIn, LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation'
import { use, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { deleteAsset, restockAsset, returnAsset, returnBulkAssignment } from '@/app/actions/assets'
import { AssetStatusBadge } from '@/components/assets/AssetStatusBadge'
import { CheckoutModal } from '@/components/assets/CheckoutModal'
import { EditAssignmentModal } from '@/components/assets/EditAssignmentModal'
import { MaintenanceTab } from '@/components/assets/MaintenanceTab'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAsset } from '@/lib/hooks/useAssets'
import { useAssetHistory } from '@/lib/hooks/useAuditLogs'
import { useAssetMaintenanceEvents } from '@/lib/hooks/useMaintenance'
import { createPolicy } from '@/lib/permissions'
import type { AssetAssignment, AuditLog, TypedAsset } from '@/lib/types'
import { computeMaxForEdit } from '@/lib/utils/availability'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

interface AssetDetailPageProps {
  params: Promise<{ id: string }>
}

export default function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { id } = use(params)
  const { slug } = useParams<{ slug: string }>()
  const { data: asset, isLoading, refresh } = useAsset(id)
  const { data: history, isLoading: historyLoading } = useAssetHistory(id)
  const { data: maintenanceEvents } = useAssetMaintenanceEvents(id)
  const { org, role, departmentIds } = useOrg()
  const deptLabel = org?.departmentLabel ?? 'Department'
  const router = useRouter()
  const searchParams = useSearchParams()
  const VALID_TABS = ['details', 'assignment', 'maintenance', 'history'] as const
  type Tab = (typeof VALID_TABS)[number]
  const rawTab = searchParams.get('tab') ?? 'details'
  const activeTab: Tab = (VALID_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as Tab)
    : 'details'

  function setActiveTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!searchParams.get('tab')) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'details')
      router.replace(`?${params.toString()}`, { scroll: false })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.querySelector<HTMLElement>('[data-main-scroll]')?.scrollTo({ top: 0 })
  }, [activeTab])
  const [restockOpen, setRestockOpen] = useState(false)
  const [returnAssignment, setReturnAssignment] = useState<AssetAssignment | null>(null)
  const [editAssignment, setEditAssignment] = useState<AssetAssignment | null>(null)

  if (isLoading)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20 rounded-md" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
        <div>
          <Skeleton className="h-8 w-64" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <div>
          <Skeleton className="h-9 w-80 rounded-lg" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    )
  if (!asset) return notFound()

  const canEditAssets = role
    ? createPolicy({ role, departmentIds }).can('asset:update', {
        departmentId: asset.departmentId,
      })
    : false
  const canCheckOut = asset.isAvailable

  async function handleReturn() {
    await returnAsset(slug, asset!.id)
    refresh()
  }

  async function handleDelete() {
    await deleteAsset(slug, asset!.id)
    router.push(`/orgs/${slug}/assets`)
  }

  return (
    <>
      <div className="space-y-6">
        {/* Back + actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${slug}/assets`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Assets
            </Link>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {canEditAssets && canCheckOut && (
              <Button variant="outline" size="sm" onClick={() => setCheckoutOpen(true)}>
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Check out</span>
              </Button>
            )}
            {canEditAssets && asset.ui.secondaryAction === 'return' && (
              <Button variant="outline" size="sm" onClick={handleReturn}>
                <LogIn className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Return</span>
              </Button>
            )}
            {canEditAssets && asset.ui.secondaryAction === 'restock' && (
              <Button variant="outline" size="sm" onClick={() => setRestockOpen(true)}>
                <Plus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Restock</span>
              </Button>
            )}
            {canEditAssets && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/orgs/${slug}/assets/${asset.id}/edit`}>
                    <Pencil className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Delete</span>
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
              {asset.ui.statusBadgeText ? (
                <Badge variant="secondary">{asset.ui.statusBadgeText}</Badge>
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
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="assignment">{asset.ui.assignmentTabLabel}</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </div>

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
                      <p className="text-2xl font-bold text-green-500">{asset.available}</p>
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
            <AssignmentTabContent
              asset={asset}
              canEditAssets={canEditAssets}
              deptLabel={deptLabel}
              onEditAssignment={setEditAssignment}
              onReturnAssignment={setReturnAssignment}
            />
          </TabsContent>

          {/* Maintenance tab */}
          <TabsContent value="maintenance" className="mt-4">
            <MaintenanceTab
              assetId={asset.id}
              assetDepartmentId={asset.departmentId}
              isBulk={asset.isBulk}
              onAssetRefresh={refresh}
            />
          </TabsContent>

          {/* History tab */}
          <TabsContent value="history" className="mt-4">
            <HistoryTabContent history={history} isLoading={historyLoading} />
          </TabsContent>
        </Tabs>
      </div>

      {checkoutOpen && (
        <CheckoutModal
          asset={asset}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          onSuccess={refresh}
          scheduledEvent={maintenanceEvents.find((e) => e.status === 'scheduled') ?? null}
        />
      )}

      {restockOpen && (
        <RestockModal
          assetName={asset.name}
          open={restockOpen}
          onOpenChange={setRestockOpen}
          onConfirm={async (qty) => {
            const result = await restockAsset(slug, asset.id, qty)
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
              ? computeMaxForEdit(asset.quantity, asset.quantityCheckedOut, editAssignment.quantity)
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
            const result = await returnBulkAssignment(slug, returnAssignment.id, qty)
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

function AssignmentTabContent({
  asset,
  canEditAssets,
  deptLabel,
  onEditAssignment,
  onReturnAssignment,
}: {
  asset: TypedAsset
  canEditAssets: boolean
  deptLabel: string
  onEditAssignment: (a: AssetAssignment) => void
  onReturnAssignment: (a: AssetAssignment) => void
}) {
  if (asset.isBulk) {
    if (asset.activeAssignments.length === 0) {
      return (
        <div className="text-muted-foreground rounded-xl border py-12 text-center text-sm">
          No items currently checked out.
        </div>
      )
    }
    return (
      <div className="space-y-3">
        {asset.activeAssignments.map((a) => (
          <Card key={a.id} className="shadow-sm">
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-medium">{a.assignedToName}</span>
                  <Badge variant="secondary">{a.quantity}×</Badge>
                </div>
                <div className="text-muted-foreground grid grid-cols-1 gap-y-1 sm:grid-cols-2 sm:gap-x-6">
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
                  {a.notes && <span className="sm:col-span-2">Notes: {a.notes}</span>}
                </div>
              </div>
              {canEditAssets && (
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEditAssignment(a)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onReturnAssignment(a)}>
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
  }

  if (!asset.currentAssignment) {
    return (
      <div className="text-muted-foreground rounded-xl border py-12 text-center text-sm">
        This asset is not currently checked out.
      </div>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">Current assignment</CardTitle>
        {canEditAssets && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditAssignment(asset.currentAssignment!)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <DetailRow label="Assigned to" value={asset.currentAssignment.assignedToName} />
        <DetailRow label="Assigned by" value={asset.currentAssignment.assignedByName} />
        <DetailRow label="Assigned on" value={formatDate(asset.currentAssignment.assignedAt)} />
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
  )
}

function HistoryTabContent({ history, isLoading }: { history: AuditLog[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-0 rounded-md border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    )
  }
  if (history.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border py-12 text-center text-sm">
        No activity recorded yet.
      </div>
    )
  }
  return (
    <div className="space-y-0 rounded-md border">
      {history.map((log, i) => (
        <AuditLogRow key={log.id} log={log} isLast={i === history.length - 1} />
      ))}
    </div>
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
      <DialogContent className="sm:max-w-xs" aria-describedby={undefined}>
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
      <DialogContent className="sm:max-w-xs" aria-describedby={undefined}>
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

const ACTION_LABELS: Record<AuditLog['action'], string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  checked_out: 'Checked out',
  returned: 'Returned',
  status_changed: 'Status changed',
  invited: 'Invited',
  role_changed: 'Role changed',
  maintenance_scheduled: 'Maintenance scheduled',
  maintenance_started: 'Maintenance started',
  maintenance_completed: 'Maintenance completed',
  maintenance_updated: 'Maintenance updated',
  maintenance_deleted: 'Maintenance deleted',
}

const ACTION_COLORS: Record<AuditLog['action'], string> = {
  created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  checked_out: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  returned: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  status_changed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  invited: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  role_changed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  maintenance_scheduled: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  maintenance_started: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  maintenance_completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  maintenance_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  maintenance_deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function AuditLogRow({ log, isLast }: { log: AuditLog; isLast: boolean }) {
  const changes = log.changes ?? {}
  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${!isLast ? 'border-b' : ''}`}>
      <span
        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action]}`}
      >
        {ACTION_LABELS[log.action]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm">
          <span className="font-medium">{log.actorName}</span>
          {changes.assignedTo && (
            <span className="text-muted-foreground">
              {log.action === 'checked_out'
                ? ` → ${String(changes.assignedTo.new)}`
                : ` ← ${String(changes.assignedTo.old)}`}
            </span>
          )}
          {changes.quantity && !changes.assignedTo && (
            <span className="text-muted-foreground">
              {' '}
              qty {String(changes.quantity.old)} → {String(changes.quantity.new)}
            </span>
          )}
          {changes.name && (
            <span className="text-muted-foreground">
              {' '}
              renamed to &ldquo;{String(changes.name.new)}&rdquo;
            </span>
          )}
          {changes.status && (
            <span className="text-muted-foreground">
              {' '}
              {String(changes.status.old)} → {String(changes.status.new)}
            </span>
          )}
        </p>
      </div>
      <time className="text-muted-foreground shrink-0 text-xs" title={formatDate(log.createdAt)}>
        {formatRelativeTime(log.createdAt)}
      </time>
    </div>
  )
}
