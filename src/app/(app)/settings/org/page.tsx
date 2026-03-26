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
import { useOrg } from '@/providers/OrgProvider'

const OrgFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
})
type OrgFormInput = z.infer<typeof OrgFormSchema>

export default function OrgSettingsPage() {
  const { org, setOrg } = useOrg()

  const form = useForm<OrgFormInput>({
    resolver: zodResolver(OrgFormSchema),
    defaultValues: { name: '', slug: '' },
  })

  useEffect(() => {
    if (org) {
      form.reset({ name: org.name, slug: org.slug })
    }
  }, [org, form])

  async function onSubmit(data: OrgFormInput) {
    const result = await updateOrganization(data)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (org) setOrg({ ...org, name: data.name, slug: data.slug })
    toast.success('Organisation settings saved')
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Organisation</CardTitle>
          <CardDescription>Update your organisation name and URL slug.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
