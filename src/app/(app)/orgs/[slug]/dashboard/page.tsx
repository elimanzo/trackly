'use client'

import { Activity, AlertTriangle, CheckCircle, DollarSign, Package, Wrench } from 'lucide-react'
import dynamic from 'next/dynamic'

import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { StatCard } from '@/components/dashboard/StatCard'
import { UpcomingMaintenance } from '@/components/dashboard/UpcomingMaintenance'
import { WarrantyAlerts } from '@/components/dashboard/WarrantyAlerts'
import { FadeIn } from '@/components/motion/FadeIn'
import { StaggerChildren, StaggerItem } from '@/components/motion/StaggerChildren'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecentActivity } from '@/lib/hooks/useAuditLogs'
import { useDashboardStats } from '@/lib/hooks/useDashboardStats'
import { formatCompactCurrency } from '@/lib/utils/formatters'
import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

const AssetsByStatusChart = dynamic(
  () => import('@/components/dashboard/AssetsByStatusChart').then((m) => m.AssetsByStatusChart),
  { ssr: false, loading: () => <Skeleton className="h-[288px] w-full rounded-xl" /> }
)

const AssetsByDepartmentChart = dynamic(
  () =>
    import('@/components/dashboard/AssetsByDepartmentChart').then((m) => m.AssetsByDepartmentChart),
  { ssr: false, loading: () => <Skeleton className="h-[288px] w-full rounded-xl" /> }
)

function greeting(name: string): string {
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${name.split(' ')[0]}`
  if (hour < 17) return `Good afternoon, ${name.split(' ')[0]}`
  return `Good evening, ${name.split(' ')[0]}`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { org } = useOrg()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: logs } = useRecentActivity(8)

  if (isLoading)
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-1.5 h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-[288px] rounded-xl" />
          <Skeleton className="h-[288px] rounded-xl" />
        </div>
      </div>
    )

  const cfg = org?.dashboardConfig ?? {}
  const showCardTotal = cfg.showCardTotal ?? true
  const showCardActive = cfg.showCardActive ?? true
  const showCardMaintenance = cfg.showCardMaintenance ?? true
  const showCardRetired = cfg.showCardRetired ?? true
  const showCardValue = cfg.showCardValue ?? true
  const showCharts = cfg.showCharts ?? true
  const showWarranty = cfg.showWarranty ?? true
  const showMaintenanceAlerts = cfg.showMaintenanceAlerts ?? true
  const showActivity = cfg.showActivity ?? true
  const deptLabel = org?.departmentLabel ?? 'Department'

  const activeCount = stats.byStatus.find((s) => s.status === 'active')?.count ?? 0
  const maintenanceCount = stats.byStatus.find((s) => s.status === 'under_maintenance')?.count ?? 0
  const retiredCount = stats.byStatus.find((s) => s.status === 'retired')?.count ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">
          {user ? greeting(user.fullName) : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Here&apos;s what&apos;s happening across your organization.
        </p>
      </div>

      {/* Stat cards */}
      {(showCardTotal ||
        showCardActive ||
        showCardMaintenance ||
        showCardRetired ||
        showCardValue) && (
        <StaggerChildren className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
          {showCardTotal && (
            <StaggerItem>
              <StatCard label="Total Assets" value={stats.totalAssets} icon={Package} />
            </StaggerItem>
          )}
          {showCardActive && (
            <StaggerItem>
              <StatCard
                label="Active"
                value={activeCount}
                icon={CheckCircle}
                description={
                  stats.totalAssets > 0
                    ? `${Math.round((activeCount / stats.totalAssets) * 100)}% of total`
                    : undefined
                }
                bgClass="bg-green-500 dark:bg-green-600"
                iconClass="text-white"
              />
            </StaggerItem>
          )}
          {showCardMaintenance && (
            <StaggerItem>
              <StatCard
                label="Maintenance"
                value={maintenanceCount}
                icon={Wrench}
                bgClass="bg-amber-500 dark:bg-amber-600"
                iconClass="text-white"
              />
            </StaggerItem>
          )}
          {showCardRetired && (
            <StaggerItem>
              <StatCard
                label="Retired"
                value={retiredCount}
                icon={AlertTriangle}
                bgClass="bg-slate-400 dark:bg-slate-600"
                iconClass="text-white"
              />
            </StaggerItem>
          )}
          {showCardValue && (
            <StaggerItem>
              <StatCard
                label="Total Value"
                value={formatCompactCurrency(stats.totalValue)}
                icon={DollarSign}
                bgClass="bg-violet-500 dark:bg-violet-600"
                iconClass="text-white"
              />
            </StaggerItem>
          )}
        </StaggerChildren>
      )}

      {/* Charts */}
      {showCharts && (
        <FadeIn delay={0.12} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AssetsByStatusChart data={stats.byStatus} total={stats.totalAssets} />
          <AssetsByDepartmentChart data={stats.byDepartment} departmentLabel={deptLabel} />
        </FadeIn>
      )}

      {/* Activity + Warranty + Upcoming Maintenance */}
      {(showActivity || showWarranty || showMaintenanceAlerts) && (
        <FadeIn delay={0.18} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {showActivity && <RecentActivity logs={logs} />}
          {showWarranty && <WarrantyAlerts alerts={stats.warrantyAlerts} />}
          {showMaintenanceAlerts && <UpcomingMaintenance alerts={stats.upcomingMaintenance} />}
        </FadeIn>
      )}

      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Activity className="h-3.5 w-3.5" />
        <span>{stats.recentActivityCount} actions logged this period</span>
      </div>
    </div>
  )
}
