'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { updateProfileAction } from '@/app/actions/profile'
import { deleteAccountAction, leaveOrgAction } from '@/app/actions/users'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
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

function LeaveOrgDialog({ orgSlug, orgName }: { orgSlug: string; orgName: string }) {
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleLeave() {
    setLoading(true)
    const result = await leaveOrgAction(orgSlug)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    await refreshUser()
    toast.success(`Left ${orgName}`)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive text-destructive hover:bg-destructive/10"
        >
          Leave
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {orgName}?</AlertDialogTitle>
          <AlertDialogDescription>
            You will lose access immediately. You can be re-invited by an admin later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={handleLeave}
          >
            {loading ? 'Leaving…' : 'Leave'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteAccountDialog() {
  const { signOut } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const result = await deleteAccountAction()
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    await signOut()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            Your account will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={handleDelete}
          >
            {loading ? 'Deleting…' : 'Delete account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function AccountProfilePage() {
  const { user, refreshUser } = useAuth()

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: { fullName: user?.fullName ?? '' },
  })

  async function onSubmit(data: UpdateProfileInput) {
    const result = await updateProfileAction(data)
    if (result.error) {
      toast.error(result.error)
      return
    }
    await refreshUser()
    toast.success('Profile updated')
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your profile and memberships.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
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
                <Input value={user.email} disabled />
              </FormItem>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {user.memberships.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Organisations</CardTitle>
            <CardDescription>Your current memberships.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {user.memberships.map((m) => (
              <div
                key={m.orgId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{m.orgName}</p>
                  <p className="text-muted-foreground text-xs">{m.orgSlug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {USER_ROLE_CONFIG[m.role].label}
                  </Badge>
                  {m.role !== 'owner' && <LeaveOrgDialog orgSlug={m.orgSlug} orgName={m.orgName} />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-destructive text-base">Danger zone</CardTitle>
          <CardDescription>Permanently delete your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  )
}
