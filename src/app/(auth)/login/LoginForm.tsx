'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
import { useAuth } from '@/providers/AuthProvider'

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginInput = z.infer<typeof LoginSchema>

export function LoginForm() {
  const { signIn } = useAuth()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: LoginInput) {
    const { error } = await signIn(data.email, data.password)
    if (error) {
      toast.error(error)
      return
    }
    window.location.assign('/dashboard')
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          {error === 'confirm_email'
            ? 'Please confirm your email address before signing in. Check your inbox for the verification link.'
            : 'Sign in to your account'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@company.com" {...field} />
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </Form>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
