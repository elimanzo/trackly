'use client'

import { BoxesIcon, CheckIcon, LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils/formatters'
import { useAuth } from '@/providers/AuthProvider'

const STEPS = [
  { label: 'Create org', path: '/org/new' },
  { label: 'Departments', path: '/setup/departments' },
  { label: 'Categories', path: '/setup/categories' },
  { label: 'Done', path: '/setup/complete' },
]

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentIndex = STEPS.findIndex((s) => s.path === pathname)
  const { user, signOut } = useAuth()

  // Each step slot is equal width (flex-1). Circle center sits at 50% of that slot.
  // So the line starts at (1 / STEPS.length / 2) and ends at the mirror on the right.
  const edgePct = 100 / (STEPS.length * 2)
  const progressPct =
    currentIndex > 0 ? (currentIndex / (STEPS.length - 1)) * (100 - edgePct * 2) : 0

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-border bg-card flex h-14 items-center justify-between border-b px-6 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg shadow-sm">
            <BoxesIcon className="text-primary-foreground h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Trackly</span>
          <span className="text-muted-foreground ml-2 text-xs">Organization Setup</span>
        </div>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{user.fullName}</p>
                <p className="text-muted-foreground truncate text-xs">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Stepper */}
      <div className="border-border bg-card border-b px-6 py-4">
        <div className="mx-auto max-w-lg">
          <div className="relative">
            {/* Background track */}
            <div
              className="bg-muted absolute top-3.5 h-0.5"
              style={{ left: `${edgePct}%`, right: `${edgePct}%` }}
            />
            {/* Progress fill */}
            {progressPct > 0 && (
              <div
                className="bg-primary absolute top-3.5 h-0.5"
                style={{ left: `${edgePct}%`, width: `${progressPct}%` }}
              />
            )}
            {/* Steps — each is flex-1 so circles are evenly distributed */}
            <div className="relative flex">
              {STEPS.map((step, i) => {
                const isDone = i < currentIndex
                const isCurrent = i === currentIndex
                return (
                  <div key={step.path} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                        isDone && 'bg-primary text-primary-foreground',
                        isCurrent && 'bg-primary text-primary-foreground ring-primary/30 ring-2',
                        !isDone && !isCurrent && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isDone ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        'text-xs whitespace-nowrap',
                        isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-start justify-center p-6 pt-10">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  )
}
