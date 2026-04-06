'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { acceptAuthenticatedInviteAction } from '@/app/actions/invites'
import { RoleBadge } from '@/components/shared/RoleBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserRole } from '@/lib/types'

interface InviteConfirmFormProps {
  token: string
  orgName: string
  role: string
}

export function InviteConfirmForm({ token, orgName, role }: InviteConfirmFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    setLoading(true)
    const result = await acceptAuthenticatedInviteAction(token)
    if ('error' in result) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    window.location.assign(`/orgs/${result.orgSlug}/dashboard`)
  }

  function handleDecline() {
    window.location.assign('/orgs')
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">You&apos;ve been invited to join {orgName}</CardTitle>
        <CardDescription>
          You&apos;ll join as{' '}
          <RoleBadge role={role as UserRole} className="ml-0.5 align-middle text-xs" />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button className="w-full" onClick={handleAccept} disabled={loading}>
          {loading ? 'Joining…' : 'Accept invitation'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={handleDecline} disabled={loading}>
          Decline
        </Button>
      </CardContent>
    </Card>
  )
}
