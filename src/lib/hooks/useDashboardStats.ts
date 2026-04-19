import { useQuery } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import type {
  DashboardStats,
  DepartmentBreakdown,
  StatusBreakdown,
  UpcomingMaintenanceAlert,
  WarrantyAlert,
} from '@/lib/types'
import { useOrg } from '@/providers/OrgProvider'

const EMPTY: DashboardStats = {
  totalAssets: 0,
  totalValue: 0,
  byStatus: [],
  byDepartment: [],
  warrantyAlerts: [],
  upcomingMaintenance: [],
  recentActivityCount: 0,
}

type DashboardAggregatesRPC = {
  total_assets: number
  total_value: number
  by_status: Array<{ status: string; count: number }>
  by_department: Array<{
    department_id: string
    department_name: string
    count: number
    value: number
  }>
}

export function useDashboardStats(): { data: DashboardStats; isLoading: boolean } {
  const { org } = useOrg()
  const orgId = org?.id ?? ''

  const { data = EMPTY, isLoading } = useQuery({
    queryKey: ['dashboardStats', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const supabase = createClient()
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const today = new Date().toISOString().split('T')[0]

      const [aggResult, warrantyRows, upcomingMaintenanceRows, activityCount] = await Promise.all([
        supabase.rpc('get_dashboard_aggregates', { p_org_id: orgId }),

        supabase
          .from('assets')
          .select('id, asset_tag, name, warranty_expiry, departments(name)')
          .eq('org_id', orgId)
          .is('deleted_at', null)
          .not('warranty_expiry', 'is', null)
          .lte('warranty_expiry', thirtyDays)
          .order('warranty_expiry'),

        supabase
          .from('maintenance_events')
          .select(
            'id, asset_id, title, scheduled_date, assets!inner(asset_tag, name, departments(name))'
          )
          .eq('org_id', orgId)
          .eq('status', 'scheduled')
          .is('deleted_at', null)
          .gte('scheduled_date', today)
          .lte('scheduled_date', thirtyDays)
          .order('scheduled_date'),

        supabase
          .from('audit_logs')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ])

      const agg = (aggResult.data ?? null) as DashboardAggregatesRPC | null
      const totalAssets = agg?.total_assets ?? 0
      const totalValue = Number(agg?.total_value ?? 0)

      const byStatus: StatusBreakdown[] = (agg?.by_status ?? []).map(({ status, count }) => ({
        status: status as StatusBreakdown['status'],
        count,
      }))

      const byDepartment: DepartmentBreakdown[] = (agg?.by_department ?? []).map(
        ({ department_id, department_name, count, value }) => ({
          departmentId: department_id,
          departmentName: department_name,
          count,
          value: Number(value),
        })
      )

      const now = new Date()
      const warrantyAlerts: WarrantyAlert[] = (
        (warrantyRows.data ?? []) as Record<string, unknown>[]
      ).map((r) => {
        const expiry = new Date(r.warranty_expiry as string)
        const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          assetId: r.id as string,
          assetTag: r.asset_tag as string,
          assetName: r.name as string,
          departmentName: (r.departments as { name: string } | null)?.name ?? null,
          warrantyExpiry: r.warranty_expiry as string,
          daysRemaining,
        }
      })

      type MaintenanceRow = Record<string, unknown> & {
        assets: { asset_tag: string; name: string; departments: { name: string } | null }
      }
      const upcomingMaintenance: UpcomingMaintenanceAlert[] = (
        (upcomingMaintenanceRows.data ?? []) as MaintenanceRow[]
      ).map((r) => {
        const scheduled = new Date(r.scheduled_date as string)
        const daysUntil = Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          eventId: r.id as string,
          assetId: r.asset_id as string,
          assetTag: r.assets.asset_tag,
          assetName: r.assets.name,
          departmentName: r.assets.departments?.name ?? null,
          title: r.title as string,
          scheduledDate: r.scheduled_date as string,
          daysUntil,
        }
      })

      return {
        totalAssets,
        totalValue,
        byStatus,
        byDepartment,
        warrantyAlerts,
        upcomingMaintenance,
        recentActivityCount: activityCount.count ?? 0,
      }
    },
    staleTime: 60_000,
  })

  return { data, isLoading }
}
