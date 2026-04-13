'use client'

import { VisuallyHidden } from 'radix-ui'
import { useEffect, useState } from 'react'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/providers/AuthProvider'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Next.js can scroll the window on navigation (focus management, scroll
  // restoration). This shell uses a custom scroll container, so window.scrollY
  // must always be 0. Snap it back immediately whenever it drifts.
  useEffect(() => {
    const lock = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    }
    window.addEventListener('scroll', lock, { passive: true })
    return () => window.removeEventListener('scroll', lock)
  }, [])

  if (isLoading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="bg-background flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <VisuallyHidden.Root>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden.Root>
          <Sidebar onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="min-h-0 flex-1 overflow-hidden">
          <div data-main-scroll className="h-full overflow-y-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
