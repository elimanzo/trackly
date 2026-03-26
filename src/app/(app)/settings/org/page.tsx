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
  showCharts: z.boolean(),
  showWarranty: z.boolean(),
  showActivity: z.boolean(),
})
type OrgFormInput = z.infer<typeof OrgFormSchema>

export default function OrgSettingsPage() {
  const { org, setOrg } = useOrg()

  const form = useForm<OrgFormInput>({
    resolver: zodResolver(OrgFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      departmentLabel: 'Department',
      showCharts: true,
      showWarranty: true,
      showActivity: true,
    },
  })

  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name,
        slug: org.slug,
        departmentLabel: org.departmentLabel,
        showCharts: org.dashboardConfig.showCharts ?? true,
        showWarranty: org.dashboardConfig.showWarranty ?? true,
        showActivity: org.dashboardConfig.showActivity ?? true,
      })
    }
  }, [org, form])

  async function onSubmit(data: OrgFormInput) {
    const result = await updateOrganization({
      name: data.name,
      slug: data.slug,
      departmentLabel: data.departmentLabel,
      dashboardConfig: {
        showCharts: data.showCharts,
        showWarranty: data.showWarranty,
        showActivity: data.showActivity,
      },
    })
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (org) {
      setOrg({
        ...org,
        name: data.name,
        slug: data.slug,
        departmentLabel: data.departmentLabel,
        dashboardConfig: {
          showCharts: data.showCharts,
          showWarranty: data.showWarranty,
          showActivity: data.showActivity,
        },
      })
    }
    toast.success('Organisation settings saved')
  }

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
                      Used in your organisation&apos;s URL. Lowercase letters, numbers, and hyphens
                      only.
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
                      This replaces &quot;Department&quot; everywhere in the app — nav, tables,
                      filters, and forms.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Dashboard visibility */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Dashboard widgets</CardTitle>
              <CardDescription>
                Control which sections are visible to everyone in your organisation.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-md space-y-5">
              <FormField
                control={form.control}
                name="showCharts"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div>
                      <FormLabel>Charts</FormLabel>
                      <FormDescription className="text-xs">
                        Assets by status and by {form.watch('departmentLabel').toLowerCase()}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="showWarranty"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div>
                      <FormLabel>Warranty alerts</FormLabel>
                      <FormDescription className="text-xs">
                        Assets with upcoming or expired warranties
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="showActivity"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div>
                      <FormLabel>Recent activity</FormLabel>
                      <FormDescription className="text-xs">
                        Latest changes across the organisation
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
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
