'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const { onboardingCompleted } = useOrg()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!onboardingCompleted) {
      router.replace('/org/new')
    }
  }, [isLoading, user, onboardingCompleted, router])

  if (isLoading || !user) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <Sidebar onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
