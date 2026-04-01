'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { acceptInviteAction } from '@/app/actions/invites'
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
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

const AcceptInviteSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>

export function AcceptInviteForm() {
  const searchParams = useSearchParams()
  const orgName = searchParams.get('org') ?? ''
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const supabase = createClient()
    const next = `/invite/accept/google-complete${orgName ? `?org=${encodeURIComponent(orgName)}` : ''}`
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      toast.error(error.message)
      setGoogleLoading(false)
    }
    // On success the browser redirects away — no need to reset loading
  }

  const form = useForm<AcceptInviteInput>({
    resolver: zodResolver(AcceptInviteSchema),
    defaultValues: { fullName: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(data: AcceptInviteInput) {
    const result = await acceptInviteAction(data.fullName, data.password)
    if (result.error !== null) {
      toast.error(result.error)
      return
    }
    // Sign in with the newly set password to establish a full auth session
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.email,
      password: data.password,
    })
    if (signInError) {
      toast.error(signInError.message)
      return
    }
    toast.success('Welcome! Your account is ready.')
    window.location.assign('/dashboard')
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">
          {orgName ? `You've been invited to join ${orgName}` : 'Accept your invite'}
        </CardTitle>
        <CardDescription>Set your name and a password to get started</CardDescription>
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
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

        <div className="mt-4 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs">or</span>
          <Separator className="flex-1" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          disabled={googleLoading || form.formState.isSubmitting}
          onClick={handleGoogleSignIn}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {googleLoading ? 'Redirecting…' : 'Continue with Google instead'}
        </Button>
      </CardContent>
    </Card>
  )
}
