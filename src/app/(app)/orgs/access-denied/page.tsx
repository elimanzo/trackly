'use client'

import { ShieldX } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
        <ShieldX className="text-muted-foreground h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Not a member</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          You are not a member of this organisation. Contact an admin to get an invite, or switch to
          one of your other organisations.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/orgs">Go to my organisations</Link>
      </Button>
    </div>
  )
}
