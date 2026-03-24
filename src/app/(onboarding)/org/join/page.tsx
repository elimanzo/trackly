import { Mail } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function JoinOrgPage() {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Waiting for an invite</CardTitle>
        <CardDescription>
          You need to be invited by an admin to join an existing organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/60 flex items-start gap-3 rounded-lg p-4">
          <Mail className="text-primary mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-muted-foreground text-sm">
            Ask your organization&apos;s admin to invite you by email. Once you accept, you&apos;ll
            be automatically added to the workspace.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/org/new">Create a new organization instead</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in with a different account</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
