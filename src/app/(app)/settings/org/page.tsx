'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { updateOrganization } from '@/app/actions/org'
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
import { Switch } from '@/components/ui/switch'
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

export default function OrgSettingsPage() {
  const { org, setOrg } = useOrg()
  const { user } = useAuth()
  const router = useRouter()
  const isOwner = user?.role === 'owner'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (user && !isOwner && !isAdmin) router.replace('/settings/profile')
  }, [user, isOwner, isAdmin, router])

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

  if (!user || (!isOwner && !isAdmin)) return null

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
    const result = await updateOrganization({
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
    if (org)
      setOrg({
        ...org,
        name: data.name,
        slug: data.slug,
        departmentLabel: data.departmentLabel,
        dashboardConfig,
        assetTableConfig,
        reportConfig,
      })
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
