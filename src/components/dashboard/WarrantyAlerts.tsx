import { AlertTriangle, ShieldCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { WarrantyAlert } from '@/lib/types'
import { formatDate } from '@/lib/utils/formatters'

interface WarrantyAlertsProps {
  alerts: WarrantyAlert[]
}

export function WarrantyAlerts({ alerts }: WarrantyAlertsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Warranty Expiring Soon
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
              <ShieldCheck className="h-8 w-8 text-green-500 opacity-60" />
              <p className="text-muted-foreground text-sm">No warranties expiring soon.</p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {alerts.map((alert) => (
                <li key={alert.assetId} className="flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-xs font-medium">
                      {alert.assetName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {alert.assetTag}
                      {alert.departmentName ? ` · ${alert.departmentName}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge
                      variant={alert.daysRemaining <= 7 ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {alert.daysRemaining}d
                    </Badge>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDate(alert.warrantyExpiry)}
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
