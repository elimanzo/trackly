'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { CreateOrganizationSchema, type CreateOrganizationInput } from '@/lib/types'
import { slugify } from '@/lib/utils/formatters'
import { useAuth } from '@/providers/AuthProvider'

export default function CreateOrgPage() {
  const { user } = useAuth()
  const router = useRouter()

  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(CreateOrganizationSchema),
    defaultValues: { name: '', slug: '' },
  })

  const watchedName = form.watch('name')
  useEffect(() => {
    if (watchedName) {
      form.setValue('slug', slugify(watchedName), { shouldValidate: false })
    }
  }, [watchedName, form])

  // If not logged in, redirect to signup
  useEffect(() => {
    if (!user) router.replace('/signup')
  }, [user, router])

  function onSubmit(_data: CreateOrganizationInput) {
    // Phase 2: will create org in Supabase
    router.push('/setup/departments')
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>
          Set up your company&apos;s workspace. You can change this later in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...field} />
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
                    <Input placeholder="acme-corp" {...field} />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    Used in your workspace URL: asset-tracker.app/
                    <strong>{field.value || 'your-org'}</strong>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Create Organization
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
