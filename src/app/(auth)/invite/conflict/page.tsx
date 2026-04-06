import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function InviteConflictPage() {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Already in an organization</CardTitle>
        <CardDescription>Your account is already a member of another organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Each account can only belong to one organization. If you believe this is a mistake or need
          to switch organizations, please contact your administrator or reach out to support.
        </p>
        <Button asChild className="w-full">
          <Link href="/orgs">Go to your dashboard</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Sign in with a different account</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
