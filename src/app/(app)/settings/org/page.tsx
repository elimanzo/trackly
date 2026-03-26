'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
  const dc = org?.dashboardConfig ?? {}
  const tc = org?.assetTableConfig ?? {}

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
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org])

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
    const result = await updateOrganization({
      name: data.name,
      slug: data.slug,
      departmentLabel: data.departmentLabel,
      dashboardConfig,
      assetTableConfig,
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
      })
    toast.success('Organisation settings saved')
  }

  const deptLabel = form.watch('departmentLabel') || 'Department'

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Organisation</CardTitle>
              <CardDescription>Update your organisation name and URL slug.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-md space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL slug</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
            <CardContent className="max-w-md">
              <FormField
                control={form.control}
                name="departmentLabel"
                render={({ field }) => (
                  <FormItem>
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
            <CardContent className="max-w-md space-y-4">
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
            <CardContent className="max-w-md space-y-4">
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
            <CardContent className="max-w-md space-y-4">
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

          <Button type="submit" disabled={form.formState.isSubmitting}>
            Save changes
          </Button>
        </form>
      </Form>
    </div>
  )
}
