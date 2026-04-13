'use client'

import { usePathname } from 'next/navigation'
import { useLayoutEffect } from 'react'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // useLayoutEffect fires before the browser paints — no visible frame
  // with the wrong scroll position. useEffect fires after paint, causing
  // a brief flash of the stale position on every navigation.
  useLayoutEffect(() => {
    document.querySelector<HTMLElement>('[data-main-scroll]')?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div key={pathname} className="animate-in fade-in-0 duration-200">
      {children}
    </div>
  )
}
