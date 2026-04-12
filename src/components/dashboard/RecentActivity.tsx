import {
  ArrowLeftRight,
  CirclePlus,
  Pencil,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AuditAction, AuditLog } from '@/lib/types'
import { formatRelativeTime } from '@/lib/utils/formatters'

const ACTION_CONFIG: Record<
  AuditAction,
  { label: string; icon: React.ElementType; color: string }
> = {
  created: { label: 'Created', icon: CirclePlus, color: 'text-green-500' },
  updated: { label: 'Updated', icon: Pencil, color: 'text-blue-500' },
  deleted: { label: 'Deleted', icon: Trash2, color: 'text-destructive' },
  checked_out: { label: 'Checked out', icon: ArrowLeftRight, color: 'text-primary' },
  returned: { label: 'Returned', icon: ArrowLeftRight, color: 'text-green-500' },
  status_changed: { label: 'Status changed', icon: TrendingUp, color: 'text-amber-500' },
  invited: { label: 'Invited', icon: UserPlus, color: 'text-teal-500' },
  role_changed: { label: 'Role changed', icon: UserCheck, color: 'text-indigo-500' },
  maintenance_scheduled: { label: 'Maintenance scheduled', icon: Wrench, color: 'text-cyan-500' },
  maintenance_started: { label: 'Maintenance started', icon: Wrench, color: 'text-amber-500' },
  maintenance_completed: { label: 'Maintenance completed', icon: Wrench, color: 'text-green-500' },
  maintenance_updated: { label: 'Maintenance updated', icon: Wrench, color: 'text-blue-500' },
  maintenance_deleted: { label: 'Maintenance deleted', icon: Wrench, color: 'text-destructive' },
}

interface RecentActivityProps {
  logs: AuditLog[]
}

export function RecentActivity({ logs }: RecentActivityProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          {logs.length === 0 ? (
            <p className="text-muted-foreground px-5 py-8 text-center text-sm">No activity yet.</p>
          ) : (
            <ul className="divide-border divide-y">
              {logs.map((log) => {
                const config = ACTION_CONFIG[log.action]
                const Icon = config.icon
                const href =
                  log.entityType === 'asset' && log.action !== 'deleted'
                    ? `/assets/${log.entityId}`
                    : null
                const inner = (
                  <>
                    <div className="bg-muted mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                      <Icon className={`h-3 w-3 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-xs font-medium">
                        {log.entityName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {config.label} by {log.actorName}
                      </p>
                    </div>
                    <time className="text-muted-foreground shrink-0 text-xs">
                      {formatRelativeTime(log.createdAt)}
                    </time>
                  </>
                )
                return href ? (
                  <li key={log.id}>
                    <Link
                      href={href}
                      className="hover:bg-muted/50 flex items-start gap-3 px-5 py-3 transition-colors"
                    >
                      {inner}
                    </Link>
                  </li>
                ) : (
                  <li key={log.id} className="flex items-start gap-3 px-5 py-3">
                    {inner}
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
