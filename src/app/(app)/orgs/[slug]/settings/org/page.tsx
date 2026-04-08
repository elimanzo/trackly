'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { deleteOrgAction, updateOrganization } from '@/app/actions/org'
import { transferOwnershipAction } from '@/app/actions/users'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { orgUserKeys, useOrgUsers } from '@/lib/hooks/useOrgUsers'
import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

const OrgFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  departmentLabel: z.string().min(1, 'Label is required').max(50),
  // Dashboard stat cards
  showCardTotal: z.boolean(),
  showCardActive: z.boolean(),
  showCardMaintenance: z.boolean(),
  showCardRetired: z.boolean(),
  showCardValue: z.boolean(),
  // Dashboard sections
  showCharts: z.boolean(),
  showWarranty: z.boolean(),
  showActivity: z.boolean(),
  // Asset table columns
  showColAssignedTo: z.boolean(),
  showColDepartment: z.boolean(),
  showColCategory: z.boolean(),
  showColLocation: z.boolean(),
  showColStatus: z.boolean(),
  showColPurchaseDate: z.boolean(),
  showColPurchaseCost: z.boolean(),
  showColWarrantyExpiry: z.boolean(),
  showColVendor: z.boolean(),
  // Report columns
  showRptAssignedTo: z.boolean(),
  showRptDepartment: z.boolean(),
  showRptCategory: z.boolean(),
  showRptLocation: z.boolean(),
  showRptStatus: z.boolean(),
  showRptPurchaseDate: z.boolean(),
  showRptPurchaseCost: z.boolean(),
  showRptWarrantyExpiry: z.boolean(),
  showRptVendor: z.boolean(),
  showRptNotes: z.boolean(),
})
type OrgFormInput = z.infer<typeof OrgFormSchema>

function ToggleRow({
  name,
  label,
  description,
  control,
}: {
  name: keyof OrgFormInput
  label: string
  description?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4">
          <div>
            <FormLabel className="font-normal">{label}</FormLabel>
            {description && <FormDescription className="text-xs">{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  )
}

function DeleteOrgCard({ slug, orgName }: { slug: string; orgName: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const result = await deleteOrgAction(slug)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    router.push('/orgs')
  }

  return (
    <Card className="border-destructive/40 shadow-sm">
      <CardHeader>
        <CardTitle className="text-destructive text-base">Danger zone</CardTitle>
        <CardDescription>
          Permanently delete this organisation and all its data — assets, departments, categories,
          locations, and activity history. All members will lose access. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog onOpenChange={() => setConfirm('')}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete organisation</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete organisation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{orgName}</strong> and all its data. This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-1 pb-2">
              <p className="text-muted-foreground mb-2 text-sm">
                Type <strong>{orgName}</strong> to confirm
              </p>
              <Input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={orgName}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={confirm !== orgName || loading}
                onClick={handleDelete}
              >
                {loading ? 'Deleting…' : 'Delete organisation'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

function TransferOwnershipCard({ slug }: { slug: string }) {
  const { users } = useOrgUsers()
  const { user, refreshUser } = useAuth()
  const { org } = useOrg()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [loading, setLoading] = useState(false)

  const admins = users.filter((u) => u.role === 'admin' && u.id !== user?.id)
  const selectedAdmin = admins.find((u) => u.id === selectedUserId)

  async function handleTransfer() {
    if (!selectedUserId) return
    setLoading(true)
    const result = await transferOwnershipAction(slug, selectedUserId)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    if (org?.id) void queryClient.invalidateQueries({ queryKey: orgUserKeys.all(org.id) })
    await refreshUser()
    toast.success('Ownership transferred')
    router.push(`/orgs/${slug}/dashboard`)
  }

  return (
    <Card className="border-destructive/40 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Transfer ownership</CardTitle>
        <CardDescription>
          Hand over ownership of this organisation to an existing admin. You will become an admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {admins.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            There are no admins to transfer ownership to. Promote a member to admin first.
          </p>
        ) : (
          <div className="flex max-w-md items-center gap-3">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select an admin…" />
              </SelectTrigger>
              <SelectContent>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.fullName || admin.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  disabled={!selectedUserId}
                >
                  Transfer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {selectedAdmin && (
                      <>
                        <strong>{selectedAdmin.fullName || selectedAdmin.email}</strong> will become
                        the new owner and you will become an admin. This cannot be undone without
                        their cooperation.
                      </>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={loading}
                    onClick={handleTransfer}
                  >
                    {loading ? 'Transferring…' : 'Transfer ownership'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function OrgSettingsPage() {
  const { org, role } = useOrg()
  const { user } = useAuth()
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const isOwner = role === 'owner'
  const isAdmin = role === 'admin'

  useEffect(() => {
    if (user && !isOwner && !isAdmin) router.replace('/account/profile')
  }, [user, isOwner, isAdmin, router, slug])

  const dc = org?.dashboardConfig ?? {}
  const tc = org?.assetTableConfig ?? {}
  const rc = org?.reportConfig ?? {}

  const form = useForm<OrgFormInput>({
    resolver: zodResolver(OrgFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      departmentLabel: 'Department',
      showCardTotal: true,
      showCardActive: true,
      showCardMaintenance: true,
      showCardRetired: true,
      showCardValue: true,
      showCharts: true,
      showWarranty: true,
      showActivity: true,
      showColAssignedTo: true,
      showColDepartment: true,
      showColCategory: true,
      showColLocation: true,
      showColStatus: true,
      showColPurchaseDate: false,
      showColPurchaseCost: false,
      showColWarrantyExpiry: false,
      showColVendor: false,
      showRptAssignedTo: true,
      showRptDepartment: true,
      showRptCategory: true,
      showRptLocation: false,
      showRptStatus: true,
      showRptPurchaseDate: false,
      showRptPurchaseCost: false,
      showRptWarrantyExpiry: false,
      showRptVendor: false,
      showRptNotes: false,
    },
  })

  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name,
        slug: org.slug,
        departmentLabel: org.departmentLabel,
        showCardTotal: dc.showCardTotal ?? true,
        showCardActive: dc.showCardActive ?? true,
        showCardMaintenance: dc.showCardMaintenance ?? true,
        showCardRetired: dc.showCardRetired ?? true,
        showCardValue: dc.showCardValue ?? true,
        showCharts: dc.showCharts ?? true,
        showWarranty: dc.showWarranty ?? true,
        showActivity: dc.showActivity ?? true,
        showColAssignedTo: tc.showAssignedTo ?? true,
        showColDepartment: tc.showDepartment ?? true,
        showColCategory: tc.showCategory ?? true,
        showColLocation: tc.showLocation ?? true,
        showColStatus: tc.showStatus ?? true,
        showColPurchaseDate: tc.showPurchaseDate ?? false,
        showColPurchaseCost: tc.showPurchaseCost ?? false,
        showColWarrantyExpiry: tc.showWarrantyExpiry ?? false,
        showColVendor: tc.showVendor ?? false,
        showRptAssignedTo: rc.showAssignedTo ?? true,
        showRptDepartment: rc.showDepartment ?? true,
        showRptCategory: rc.showCategory ?? true,
        showRptLocation: rc.showLocation ?? false,
        showRptStatus: rc.showStatus ?? true,
        showRptPurchaseDate: rc.showPurchaseDate ?? false,
        showRptPurchaseCost: rc.showPurchaseCost ?? false,
        showRptWarrantyExpiry: rc.showWarrantyExpiry ?? false,
        showRptVendor: rc.showVendor ?? false,
        showRptNotes: rc.showNotes ?? false,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org])

  if (!role || (!isOwner && !isAdmin)) return null

  async function onSubmit(data: OrgFormInput) {
    const dashboardConfig = {
      showCardTotal: data.showCardTotal,
      showCardActive: data.showCardActive,
      showCardMaintenance: data.showCardMaintenance,
      showCardRetired: data.showCardRetired,
      showCardValue: data.showCardValue,
      showCharts: data.showCharts,
      showWarranty: data.showWarranty,
      showActivity: data.showActivity,
    }
    const assetTableConfig = {
      showAssignedTo: data.showColAssignedTo,
      showDepartment: data.showColDepartment,
      showCategory: data.showColCategory,
      showLocation: data.showColLocation,
      showStatus: data.showColStatus,
      showPurchaseDate: data.showColPurchaseDate,
      showPurchaseCost: data.showColPurchaseCost,
      showWarrantyExpiry: data.showColWarrantyExpiry,
      showVendor: data.showColVendor,
    }
    const reportConfig = {
      showAssignedTo: data.showRptAssignedTo,
      showDepartment: data.showRptDepartment,
      showCategory: data.showRptCategory,
      showLocation: data.showRptLocation,
      showStatus: data.showRptStatus,
      showPurchaseDate: data.showRptPurchaseDate,
      showPurchaseCost: data.showRptPurchaseCost,
      showWarrantyExpiry: data.showRptWarrantyExpiry,
      showVendor: data.showRptVendor,
      showNotes: data.showRptNotes,
    }
    const result = await updateOrganization(slug, {
      name: data.name,
      slug: data.slug,
      departmentLabel: data.departmentLabel,
      dashboardConfig,
      assetTableConfig,
      reportConfig,
    })
    if (result.error) {
      toast.error(result.error)
      return
    }
    router.refresh()
    toast.success('Organisation settings saved')
  }

  const deptLabel = form.watch('departmentLabel') || 'Department'

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
          {/* General */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Organisation</CardTitle>
              <CardDescription>
                {isOwner
                  ? 'Update your organisation name and URL slug.'
                  : 'Only the organisation owner can change the name and URL slug.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="max-w-md">
                    <FormLabel>Organisation name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isOwner} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem className="max-w-md">
                    <FormLabel>URL slug</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isOwner} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Lowercase letters, numbers, and hyphens only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Terminology */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Terminology</CardTitle>
              <CardDescription>
                Rename labels to match how your organisation talks about things.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="departmentLabel"
                render={({ field }) => (
                  <FormItem className="max-w-md">
                    <FormLabel>Department label</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Department, Program, Team, Division" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Replaces &quot;Department&quot; everywhere in the app.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Dashboard stat cards */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Dashboard — stat cards</CardTitle>
              <CardDescription>
                Choose which summary cards appear at the top of the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow control={form.control} name="showCardTotal" label="Total assets" />
              <ToggleRow control={form.control} name="showCardActive" label="Active" />
              <ToggleRow control={form.control} name="showCardMaintenance" label="In maintenance" />
              <ToggleRow control={form.control} name="showCardRetired" label="Retired" />
              <ToggleRow control={form.control} name="showCardValue" label="Total value" />
            </CardContent>
          </Card>

          {/* Dashboard sections */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Dashboard — sections</CardTitle>
              <CardDescription>
                Show or hide the larger sections below the stat cards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                control={form.control}
                name="showCharts"
                label="Charts"
                description={`Assets by status and by ${deptLabel.toLowerCase()}`}
              />
              <ToggleRow control={form.control} name="showWarranty" label="Warranty alerts" />
              <ToggleRow control={form.control} name="showActivity" label="Recent activity" />
            </CardContent>
          </Card>

          {/* Asset table columns */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Asset table — columns</CardTitle>
              <CardDescription>
                Choose which columns are visible in the assets table.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow control={form.control} name="showColAssignedTo" label="Assigned to" />
              <ToggleRow control={form.control} name="showColDepartment" label={deptLabel} />
              <ToggleRow control={form.control} name="showColCategory" label="Category" />
              <ToggleRow control={form.control} name="showColLocation" label="Location" />
              <ToggleRow control={form.control} name="showColStatus" label="Status" />
              <ToggleRow control={form.control} name="showColPurchaseDate" label="Purchase date" />
              <ToggleRow control={form.control} name="showColPurchaseCost" label="Purchase cost" />
              <ToggleRow
                control={form.control}
                name="showColWarrantyExpiry"
                label="Warranty expiry"
              />
              <ToggleRow control={form.control} name="showColVendor" label="Vendor" />
            </CardContent>
          </Card>

          {/* Report columns */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Reports — columns</CardTitle>
              <CardDescription>
                Choose which columns are included in report previews and CSV exports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow control={form.control} name="showRptAssignedTo" label="Assigned to" />
              <ToggleRow control={form.control} name="showRptDepartment" label={deptLabel} />
              <ToggleRow control={form.control} name="showRptCategory" label="Category" />
              <ToggleRow control={form.control} name="showRptLocation" label="Location" />
              <ToggleRow control={form.control} name="showRptStatus" label="Status" />
              <ToggleRow control={form.control} name="showRptPurchaseDate" label="Purchase date" />
              <ToggleRow control={form.control} name="showRptPurchaseCost" label="Purchase cost" />
              <ToggleRow
                control={form.control}
                name="showRptWarrantyExpiry"
                label="Warranty expiry"
              />
              <ToggleRow control={form.control} name="showRptVendor" label="Vendor" />
              <ToggleRow control={form.control} name="showRptNotes" label="Notes" />
            </CardContent>
          </Card>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            Save changes
          </Button>
        </form>
      </Form>

      {isOwner && <TransferOwnershipCard slug={slug} />}
      {isOwner && <DeleteOrgCard slug={slug} orgName={org?.name ?? ''} />}

      {form.formState.isDirty && (
        <div className="bg-card fixed right-0 bottom-0 left-0 z-50 border-t p-4 shadow-lg lg:left-60">
          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">You have unsaved changes</p>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => form.reset()}>
                Discard
              </Button>
              <Button
                type="button"
                disabled={form.formState.isSubmitting}
                onClick={form.handleSubmit(onSubmit)}
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
