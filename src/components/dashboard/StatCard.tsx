import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  description?: string
  bgClass?: string
  iconClass?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  bgClass,
  iconClass,
}: StatCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8',
              bgClass ?? 'bg-primary/10'
            )}
          >
            <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', iconClass ?? 'text-primary')} />
          </div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase sm:text-sm">
            {label}
          </p>
        </div>
        <p className="text-foreground mt-2.5 text-2xl font-bold">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{description ?? '\u00A0'}</p>
      </CardContent>
    </Card>
  )
}
