import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  description?: string
  colorClass?: string
}

export function StatCard({ label, value, icon: Icon, description, colorClass }: StatCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {label}
            </p>
            <p className="text-foreground mt-1 text-2xl font-bold">{value}</p>
            {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
          </div>
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              colorClass ?? 'bg-primary/10'
            )}
          >
            <Icon className={cn('h-4.5 w-4.5', colorClass ? 'text-white' : 'text-primary')} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
