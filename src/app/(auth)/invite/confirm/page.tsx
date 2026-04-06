import Link from 'next/link'
import { redirect } from 'next/navigation'

import { getInviteByTokenAction } from '@/app/actions/invites'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { InviteConfirmForm } from './InviteConfirmForm'

export default async function InviteConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) redirect('/login')

  const result = await getInviteByTokenAction(token)

  if ('error' in result) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Invite unavailable</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/orgs">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <InviteConfirmForm token={token} orgName={result.orgName} role={result.role} />
}
