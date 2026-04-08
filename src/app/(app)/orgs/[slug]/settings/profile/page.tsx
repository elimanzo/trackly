'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { deleteOrgAction } from '@/app/actions/org'
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
import { UpdateProfileSchema, type UpdateProfileInput } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

export default function ProfileSettingsPage() {
  const { user, refreshUser, signOut } = useAuth()
  const { org, role } = useOrg()
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [deleteOrgLoading, setDeleteOrgLoading] = useState(false)
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false)
  const [orgDeleteConfirm, setOrgDeleteConfirm] = useState('')

  const isOwner = role === 'owner'

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

  async function handleLeave() {
    setLeaveLoading(true)
    const result = await leaveOrgAction(slug)
    if (result.error) {
      toast.error(result.error)
      setLeaveLoading(false)
      return
    }
    await refreshUser()
    router.push('/orgs')
  }

  async function handleDeleteOrg() {
    setDeleteOrgLoading(true)
    const result = await deleteOrgAction(slug)
    if (result.error) {
      toast.error(result.error)
      setDeleteOrgLoading(false)
      return
    }
    router.push('/orgs')
  }

  async function handleDeleteAccount() {
    setDeleteAccountLoading(true)
    const result = await deleteAccountAction()
    if (result.error) {
      toast.error(result.error)
      setDeleteAccountLoading(false)
      return
    }
    await signOut()
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Update your display name.</CardDescription>
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

      <Card className="border-destructive/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-destructive text-base">Danger zone</CardTitle>
          <CardDescription>
            {isOwner
              ? 'Permanently delete this organisation and all its data.'
              : 'Leave this organisation or permanently delete your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {isOwner ? (
            <AlertDialog onOpenChange={() => setOrgDeleteConfirm('')}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete organisation</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete organisation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{org?.name}</strong> and all its data. This
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="px-1 pb-2">
                  <p className="text-muted-foreground mb-2 text-sm">
                    Type <strong>{org?.name}</strong> to confirm
                  </p>
                  <Input
                    value={orgDeleteConfirm}
                    onChange={(e) => setOrgDeleteConfirm(e.target.value)}
                    placeholder={org?.name ?? ''}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={orgDeleteConfirm !== org?.name || deleteOrgLoading}
                    onClick={handleDeleteOrg}
                  >
                    {deleteOrgLoading ? 'Deleting…' : 'Delete organisation'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  Leave organisation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave organisation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will lose access immediately. Your edits and activity will remain in the
                    system. You can be re-invited by an admin later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={leaveLoading}
                    onClick={handleLeave}
                  >
                    {leaveLoading ? 'Leaving…' : 'Leave organisation'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

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
                  disabled={deleteAccountLoading}
                  onClick={handleDeleteAccount}
                >
                  {deleteAccountLoading ? 'Deleting…' : 'Delete account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
