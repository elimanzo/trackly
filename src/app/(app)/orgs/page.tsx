'use client'

import { Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/providers/AuthProvider'

export default function OrgPickerPage() {
  const { user } = useAuth()
  const router = useRouter()
  const memberships = user?.memberships ?? []

  // Auto-redirect only if the user belongs to exactly one org
  useEffect(() => {
    if (!user || memberships.length !== 1) return
    router.replace(`/orgs/${memberships[0]!.orgSlug}/dashboard`)
  }, [user, memberships, router])

  if (!user) return null

  // Single org: redirect is already firing in useEffect — don't flash the picker
  if (memberships.length === 1) return null

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Choose an organization</h1>
        <p className="text-muted-foreground mt-1 text-sm">Select which org you want to work in</p>
      </div>
      <div className="grid w-full max-w-md gap-3">
        {memberships.map((m) => (
          <Card
            key={m.orgId}
            className="hover:border-primary cursor-pointer p-4 transition-colors"
            onClick={() => router.push(`/orgs/${m.orgSlug}/dashboard`)}
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <Building2 className="text-primary h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.orgName}</p>
                <p className="text-muted-foreground text-xs">{m.orgSlug}</p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {m.role}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
