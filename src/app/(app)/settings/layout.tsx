'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const canAccessOrgSettings = user?.role === 'owner' || user?.role === 'admin'

  const nav = [
    ...(canAccessOrgSettings ? [{ label: 'Organisation', href: '/settings/org' }] : []),
    { label: 'Profile', href: '/settings/profile' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Settings</h1>
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="flex shrink-0 flex-row gap-1 md:sticky md:top-0 md:w-44 md:flex-col md:self-start">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
