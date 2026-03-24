'use client'

import { ChevronDown, FlaskConical } from 'lucide-react'

import { RoleBadge } from '@/components/shared/RoleBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MOCK_USERS } from '@/lib/mock-data'
import { useAuth } from '@/providers/AuthProvider'

/**
 * Dev-only floating button to switch between mock users (and therefore roles).
 * Only rendered in development mode.
 */
export function RoleSwitcher() {
  const { user, switchUser } = useAuth()

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="secondary" className="gap-1.5 shadow-lg">
            <FlaskConical className="h-3.5 w-3.5" />
            <span className="text-xs">Dev: {user?.fullName.split(' ')[0] ?? 'Not signed in'}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            Switch mock user
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {MOCK_USERS.map((mockUser) => (
            <DropdownMenuItem
              key={mockUser.id}
              onClick={() => switchUser(mockUser.id)}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium">{mockUser.fullName}</p>
                <p className="text-muted-foreground text-xs">{mockUser.email}</p>
              </div>
              <RoleBadge role={mockUser.role} className="ml-2" />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
