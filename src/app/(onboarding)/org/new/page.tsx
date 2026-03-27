'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { checkOrgAvailability } from '@/app/actions/org'
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
import { useOnboarding } from '@/providers/OnboardingProvider'

export default function CreateOrgPage() {
  const router = useRouter()
  const { name, slug, setOrgInfo } = useOnboarding()

  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(CreateOrganizationSchema),
    defaultValues: { name, slug },
  })

  // Restore context state if user navigated back
  useEffect(() => {
    if (name) form.reset({ name, slug })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const watchedName = form.watch('name')
  useEffect(() => {
    // Only auto-generate slug when user hasn't manually set one yet
    if (watchedName && !slug) {
      form.setValue('slug', slugify(watchedName), { shouldValidate: false })
    }
  }, [watchedName, form, slug])

  async function onSubmit(data: CreateOrganizationInput) {
    const { nameTaken, slugTaken } = await checkOrgAvailability(data.name, data.slug)

    if (nameTaken) {
      form.setError('name', { message: 'An organization with this name already exists.' })
    }
    if (slugTaken) {
      form.setError('slug', { message: 'This URL slug is already taken.' })
    }
    if (nameTaken || slugTaken) return

    setOrgInfo(data.name, data.slug)
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
                    Used in your workspace URL: trackly.app/
                    <strong>{field.value || 'your-org'}</strong>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Checking…' : 'Next'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
