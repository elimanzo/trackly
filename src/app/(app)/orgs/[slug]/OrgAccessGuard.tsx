'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

export function OrgAccessGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const { membership } = useOrg()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && !membership) {
      router.replace('/orgs/access-denied')
    }
  }, [isLoading, user, membership, router])

  if (isLoading || !user || !membership) return null

  return <>{children}</>
}
