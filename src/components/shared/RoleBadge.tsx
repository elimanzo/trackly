import { Badge } from '@/components/ui/badge'
import { USER_ROLE_CONFIG } from '@/lib/constants'
import type { UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

const roleColors: Record<UserRole, string> = {
  owner:
    'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  admin:
    'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  editor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  viewer: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
}

interface RoleBadgeProps {
  role: UserRole
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <Badge variant="outline" className={cn('capitalize', roleColors[role], className)}>
      {USER_ROLE_CONFIG[role].label}
    </Badge>
  )
}
