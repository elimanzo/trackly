'use client'

import {
  ArrowLeftRight,
  CheckCircle,
  CirclePlus,
  Pencil,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecentActivity } from '@/lib/hooks/useAuditLogs'
import { useUpcomingMaintenanceAlerts } from '@/lib/hooks/useUpcomingMaintenanceAlerts'
import { useWarrantyAlerts } from '@/lib/hooks/useWarrantyAlerts'
import type { AuditAction, AuditLog, UpcomingMaintenanceAlert, WarrantyAlert } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatDate, formatRelativeTime } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

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

type FeedTab = 'recent-activity' | 'warranty-expiring' | 'upcoming-maintenance'

const TAB_CONFIG: {
  key: FeedTab
  label: string
  configKey: 'showActivity' | 'showWarranty' | 'showMaintenanceAlerts'
}[] = [
  { key: 'recent-activity', label: 'Activity', configKey: 'showActivity' },
  { key: 'warranty-expiring', label: 'Warranty', configKey: 'showWarranty' },
  { key: 'upcoming-maintenance', label: 'Maintenance', configKey: 'showMaintenanceAlerts' },
]

const FEED_LIMIT = 8

function ActivityList({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return <p className="text-muted-foreground px-5 py-8 text-center text-sm">No activity yet.</p>
  }
  return (
    <ul className="divide-border divide-y">
      {logs.map((log) => {
        const config = ACTION_CONFIG[log.action]
        const Icon = config.icon
        const href =
          log.entityType === 'asset' && log.action !== 'deleted' ? `/assets/${log.entityId}` : null
        const inner = (
          <>
            <div className="bg-muted mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
              <Icon className={`h-3 w-3 ${config.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-xs font-medium">{log.entityName}</p>
              <p className="text-muted-foreground truncate text-xs">
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
              className="hover:bg-muted/50 flex items-start gap-3 px-4 py-3 transition-colors"
            >
              {inner}
            </Link>
          </li>
        ) : (
          <li key={log.id} className="flex items-start gap-3 px-4 py-3">
            {inner}
          </li>
        )
      })}
    </ul>
  )
}

function WarrantyList({ alerts }: { alerts: WarrantyAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <ShieldCheck className="h-8 w-8 text-green-500 opacity-60" />
        <p className="text-muted-foreground text-sm">No warranties expiring soon.</p>
      </div>
    )
  }
  return (
    <ul className="divide-border divide-y">
      {alerts.map((alert) => (
        <li key={alert.assetId} className="flex items-start gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-xs font-medium">{alert.assetName}</p>
            <p className="text-muted-foreground truncate text-xs">
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
  )
}

function MaintenanceList({
  alerts,
  orgSlug,
}: {
  alerts: UpcomingMaintenanceAlert[]
  orgSlug: string
}) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <CheckCircle className="h-8 w-8 text-green-500 opacity-60" />
        <p className="text-muted-foreground text-sm">
          No maintenance scheduled in the next 30 days.
        </p>
      </div>
    )
  }
  return (
    <ul className="divide-border divide-y">
      {alerts.map((alert) => (
        <li key={alert.eventId} className="flex items-start gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-xs font-medium">{alert.title}</p>
            <p className="text-muted-foreground truncate text-xs">
              <Link
                href={`/orgs/${orgSlug}/assets/${alert.assetId}`}
                className="hover:text-primary hover:underline"
              >
                {alert.assetName}
              </Link>
              {alert.departmentName ? ` · ${alert.departmentName}` : ''}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <Badge variant={alert.daysUntil <= 7 ? 'destructive' : 'secondary'} className="text-xs">
              {alert.daysUntil}d
            </Badge>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {formatDate(alert.scheduledDate)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function TabNav({
  tabs,
  activeTab,
  warrantyCount,
  maintenanceCount,
  onSelect,
}: {
  tabs: typeof TAB_CONFIG
  activeTab: FeedTab
  warrantyCount: number
  maintenanceCount: number
  onSelect: (tab: FeedTab) => void
}) {
  return (
    <div className="flex items-center gap-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelect(tab.key)}
          className={cn(
            'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
            activeTab === tab.key
              ? 'bg-muted text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
          {tab.key === 'warranty-expiring' && warrantyCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {warrantyCount}
            </Badge>
          )}
          {tab.key === 'upcoming-maintenance' && maintenanceCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {maintenanceCount}
            </Badge>
          )}
        </button>
      ))}
    </div>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Feed() {
  const { org } = useOrg()
  const { slug } = useParams<{ slug: string }>()

  const cfg = org?.dashboardConfig ?? {}
  const enabledTabs = TAB_CONFIG.filter((t) => cfg[t.configKey] !== false)

  const initialTab = enabledTabs[0]?.key ?? null

  const [activeTab, setActiveTab] = useState<FeedTab | null>(initialTab)

  const handleTabChange = useCallback((tab: FeedTab) => setActiveTab(tab), [])

  const { data: activityData, isLoading: activityLoading } = useRecentActivity(FEED_LIMIT)
  const { data: warrantyData, isLoading: warrantyLoading } = useWarrantyAlerts(FEED_LIMIT)
  const { data: maintenanceData, isLoading: maintenanceLoading } =
    useUpcomingMaintenanceAlerts(FEED_LIMIT)

  if (enabledTabs.length === 0 || !activeTab) return null

  const isLoading =
    (activeTab === 'recent-activity' && activityLoading) ||
    (activeTab === 'warranty-expiring' && warrantyLoading) ||
    (activeTab === 'upcoming-maintenance' && maintenanceLoading)

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Feed</CardTitle>
          <TabNav
            tabs={enabledTabs}
            activeTab={activeTab}
            warrantyCount={warrantyData.length}
            maintenanceCount={maintenanceData.length}
            onSelect={handleTabChange}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-64">
          {isLoading ? (
            <ScrollArea className="h-full">
              <FeedSkeleton />
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full">
              {activeTab === 'recent-activity' && <ActivityList logs={activityData} />}
              {activeTab === 'warranty-expiring' && <WarrantyList alerts={warrantyData} />}
              {activeTab === 'upcoming-maintenance' && (
                <MaintenanceList alerts={maintenanceData} orgSlug={slug} />
              )}
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
