'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Reset the custom scroll container on every navigation so users
  // always land at the top of the new page.
  useEffect(() => {
    document.querySelector<HTMLElement>('[data-main-scroll]')?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div key={pathname} className="animate-in fade-in-0 duration-200">
      {children}
    </div>
  )
}
