'use client'

import { ArrowLeft, BoxesIcon } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/AuthProvider'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const backHref =
    (user?.memberships.length ?? 0) === 1
      ? `/orgs/${user!.memberships[0].orgSlug}/dashboard`
      : '/orgs'

  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden">
      <header className="border-border bg-card flex h-14 shrink-0 items-center gap-4 border-b px-6">
        <div className="flex items-center gap-2">
          <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg shadow-sm">
            <BoxesIcon className="text-primary-foreground h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Trackly</span>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href={backHref}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Link>
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-10">{children}</div>
      </div>
    </div>
  )
}
