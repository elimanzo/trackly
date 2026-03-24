'use client'

import { BoxesIcon, CheckIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const STEPS = [
  { label: 'Create org', path: '/org/new' },
  { label: 'Departments', path: '/setup/departments' },
  { label: 'Categories', path: '/setup/categories' },
  { label: 'Done', path: '/setup/complete' },
]

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentIndex = STEPS.findIndex((s) => s.path === pathname)

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-border bg-card flex h-14 items-center border-b px-6 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg shadow-sm">
            <BoxesIcon className="text-primary-foreground h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Asset Tracker</span>
        </div>
        <span className="text-muted-foreground ml-4 text-xs">Organization Setup</span>
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
