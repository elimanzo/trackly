'use client'

import { Activity, AlertTriangle, CheckCircle, DollarSign, Package, Wrench } from 'lucide-react'
import dynamic from 'next/dynamic'

import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { StatCard } from '@/components/dashboard/StatCard'
import { WarrantyAlerts } from '@/components/dashboard/WarrantyAlerts'
import { PageLoader } from '@/components/shared/PageLoader'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecentActivity } from '@/lib/hooks/useAuditLogs'
import { useDashboardStats } from '@/lib/hooks/useDashboardStats'
import { formatCurrency } from '@/lib/utils/formatters'
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

  if (isLoading) return <PageLoader />

  const cfg = org?.dashboardConfig ?? {}
  const showCharts = cfg.showCharts ?? true
  const showWarranty = cfg.showWarranty ?? true
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Assets" value={stats.totalAssets} icon={Package} />
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
        <StatCard
          label="In Maintenance"
          value={maintenanceCount}
          icon={Wrench}
          bgClass="bg-amber-500 dark:bg-amber-600"
          iconClass="text-white"
        />
        <StatCard
          label="Retired"
          value={retiredCount}
          icon={AlertTriangle}
          bgClass="bg-slate-400 dark:bg-slate-600"
          iconClass="text-white"
        />
        <StatCard
          label="Total Value"
          value={formatCurrency(stats.totalValue)}
          icon={DollarSign}
          bgClass="bg-violet-500 dark:bg-violet-600"
          iconClass="text-white"
        />
      </div>

      {/* Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AssetsByStatusChart data={stats.byStatus} total={stats.totalAssets} />
          <AssetsByDepartmentChart data={stats.byDepartment} departmentLabel={deptLabel} />
        </div>
      )}

      {/* Activity + Warranty */}
      {(showActivity || showWarranty) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {showActivity && <RecentActivity logs={logs} />}
          {showWarranty && <WarrantyAlerts alerts={stats.warrantyAlerts} />}
        </div>
      )}

      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Activity className="h-3.5 w-3.5" />
        <span>{stats.recentActivityCount} actions logged this period</span>
      </div>
    </div>
  )
}
