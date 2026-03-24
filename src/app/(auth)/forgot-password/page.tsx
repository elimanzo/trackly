'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
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

const ForgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
})

type ForgotInput = z.infer<typeof ForgotSchema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const form = useForm<ForgotInput>({
    resolver: zodResolver(ForgotSchema),
    defaultValues: { email: '' },
  })

  function onSubmit(_data: ForgotInput) {
    // Phase 2: will call Supabase resetPasswordForEmail
    setSent(true)
  }

  if (sent) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Check your inbox</CardTitle>
          <CardDescription>
            We sent a password reset link to {form.getValues('email')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-primary text-sm hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>Enter your email and we&apos;ll send you a reset link</CardDescription>
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
                    <Input type="email" placeholder="you@acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Send Reset Link
            </Button>
          </form>
        </Form>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
