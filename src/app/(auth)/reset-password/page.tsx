'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

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
import { createClient } from '@/lib/supabase/client'

const ResetSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type ResetInput = z.infer<typeof ResetSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRecovery = searchParams.get('recovery') === '1'
  const [state] = useState<'waiting' | 'ready' | 'invalid'>(isRecovery ? 'ready' : 'waiting')

  const form = useForm<ResetInput>({
    resolver: zodResolver(ResetSchema),
    defaultValues: { password: '', confirm: '' },
  })

  useEffect(() => {
    // State already initialised to 'ready' when isRecovery is true
    if (isRecovery) return

    // Direct navigation — send authenticated users to dashboard, others to login
    const supabase = createClient()
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: { access_token: string } | null } }) => {
        router.replace(data.session ? '/dashboard' : '/login')
      })
  }, [isRecovery, router])

  async function onSubmit(data: ResetInput) {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      toast.error(error.message)
      return
    }
    // updateUser doesn't refresh the access token, so the recovery AMR claim
    // is still present in the cookie. Refresh explicitly so the proxy sees a
    // normal session and allows through to the dashboard.
    await supabase.auth.signOut()
    toast.success('Password updated — please sign in with your new password')
    window.location.replace('/login')
  }

  if (state === 'invalid') {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Link expired</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired. Request a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.replace('/forgot-password')}
          >
            Request new link
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (state === 'waiting') {
    return (
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center text-sm">Verifying…</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Set new password</CardTitle>
        <CardDescription>Choose a new password for your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="At least 6 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Repeat your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Set password'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
