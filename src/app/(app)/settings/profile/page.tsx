'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

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
import { USER_ROLE_CONFIG } from '@/lib/constants'
import { UpdateProfileSchema, type UpdateProfileInput } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

import { DangerZone } from './DangerZone'

export default function ProfileSettingsPage() {
  const { user } = useAuth()
  const hasOrg = !!user?.orgId

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
    },
  })

  function onSubmit(_data: UpdateProfileInput) {
    // Phase 2: persist to Supabase + update auth context
    toast.success('Profile updated')
  }

  return (
    <div className="space-y-6">
      {!hasOrg && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Get started</CardTitle>
            <CardDescription>You are not part of an organisation yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/org/new">Continue to org setup</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Update your display name and account details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Email</FormLabel>
                <Input value={user?.email ?? ''} disabled />
              </FormItem>
              {hasOrg && (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Input value={user ? USER_ROLE_CONFIG[user.role].label : ''} disabled />
                </FormItem>
              )}
              <Button type="submit">Save changes</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <DangerZone />
    </div>
  )
}
