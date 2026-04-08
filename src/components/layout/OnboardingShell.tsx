'use client'

import { BoxesIcon, CheckIcon, LogOut, Settings } from 'lucide-react'
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
  const settingsHref = '/account/profile'

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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href={settingsHref}>
                <Settings className="mr-1.5 h-4 w-4" />
                Settings
              </Link>
            </Button>
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
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>

      {/* Stepper */}
      <div className="border-border bg-card border-b px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-0">
          {STEPS.map((step, i) => {
            const isDone = i < currentIndex
            const isCurrent = i === currentIndex

            return (
              <div key={step.path} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
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
                      'mt-1 text-xs',
                      isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mb-4 h-0.5 flex-1',
                      i < currentIndex ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-start justify-center p-6 pt-10">
        <div className="w-full max-w-lg">{children}</div>
      </div>
    </div>
  )
}
