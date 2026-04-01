'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { acceptInviteViaGoogleAction } from '@/app/actions/invites'
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

const Schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
})

type Input = z.infer<typeof Schema>

export function GoogleCompleteForm({
  defaultName,
  orgName,
}: {
  defaultName: string
  orgName: string
}) {
  const form = useForm<Input>({
    resolver: zodResolver(Schema),
    defaultValues: { fullName: defaultName },
  })

  async function onSubmit(data: Input) {
    const result = await acceptInviteViaGoogleAction(data.fullName)
    if (result.error !== null) {
      toast.error(result.error)
      return
    }
    window.location.assign('/dashboard')
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">
          {orgName ? `You've been invited to join ${orgName}` : 'Accept your invite'}
        </CardTitle>
        <CardDescription>Confirm your name to finish joining with Google</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Alex Rivera" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Setting up your account…' : 'Join organisation'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
