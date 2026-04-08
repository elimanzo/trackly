'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { deleteOrgAction } from '@/app/actions/org'
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
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

// ---------------------------------------------------------------------------
// Leave org
// ---------------------------------------------------------------------------

function LeaveOrgDialog() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleLeave() {
    setLoading(true)
    const result = await leaveOrgAction(slug)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    await refreshUser()
    router.push('/orgs')
  }

  return (
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
            You will lose access immediately. Your edits and activity will remain in the system. You
            can be re-invited by an admin later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={handleLeave}
          >
            {loading ? 'Leaving…' : 'Leave organisation'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ---------------------------------------------------------------------------
// Delete org
// ---------------------------------------------------------------------------

function DeleteOrgDialog({ orgName }: { orgName: string }) {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const result = await deleteOrgAction(slug)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    router.push('/orgs')
  }

  return (
    <AlertDialog onOpenChange={() => setConfirm('')}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete organisation</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete organisation?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{orgName}</strong> and all its data — assets,
            departments, categories, locations, and activity history. All members will lose access.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-1 pb-2">
          <p className="text-muted-foreground mb-2 text-sm">
            Type <strong>{orgName}</strong> to confirm
          </p>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={orgName}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={confirm !== orgName || loading}
            onClick={handleDelete}
          >
            {loading ? 'Deleting…' : 'Delete organisation'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ---------------------------------------------------------------------------
// Delete account
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// DangerZone — selects the right action based on user state
// ---------------------------------------------------------------------------

export function DangerZone() {
  const { user } = useAuth()
  const { org, role } = useOrg()

  if (!user) return null

  const isOwner = role === 'owner'
  const hasOrg = !!org?.id

  return (
    <Card className="border-destructive/40 shadow-sm">
      <CardHeader>
        <CardTitle className="text-destructive text-base">Danger zone</CardTitle>
        <CardDescription>
          {!hasOrg
            ? 'Permanently delete your account.'
            : isOwner
              ? 'Permanently delete your organisation and all its data.'
              : 'Leave your current organisation.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasOrg && <DeleteAccountDialog />}
        {hasOrg && isOwner && <DeleteOrgDialog orgName={org?.name ?? ''} />}
        {hasOrg && !isOwner && <LeaveOrgDialog />}
      </CardContent>
    </Card>
  )
}
