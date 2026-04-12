'use client'

import { CalendarClock, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { UpcomingMaintenanceAlert } from '@/lib/types'
import { formatDate } from '@/lib/utils/formatters'

interface UpcomingMaintenanceProps {
  alerts: UpcomingMaintenanceAlert[]
}

export function UpcomingMaintenance({ alerts }: UpcomingMaintenanceProps) {
  const { slug } = useParams<{ slug: string }>()

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-4 w-4 text-blue-500" />
          Upcoming Maintenance
          {alerts.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 opacity-60" />
              <p className="text-muted-foreground text-sm">
                No maintenance scheduled in the next 30 days.
              </p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {alerts.map((alert) => (
                <li key={alert.eventId} className="flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-xs font-medium">{alert.title}</p>
                    <p className="text-muted-foreground text-xs">
                      <Link
                        href={`/orgs/${slug}/assets/${alert.assetId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {alert.assetName}
                      </Link>
                      {alert.departmentName ? ` · ${alert.departmentName}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge
                      variant={alert.daysUntil <= 7 ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {alert.daysUntil}d
                    </Badge>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDate(alert.scheduledDate)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
