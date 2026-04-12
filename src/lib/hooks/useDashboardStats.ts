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

      const [aggregates, warrantyRows, upcomingMaintenanceRows, activityCount] = await Promise.all([
        supabase
          .from('assets')
          .select('status, department_id, purchase_cost, departments(name)')
          .eq('org_id', orgId)
          .is('deleted_at', null),

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

      const rows: Record<string, unknown>[] = (aggregates.data ?? []) as Record<string, unknown>[]
      const totalAssets = rows.length
      const totalValue = rows.reduce(
        (sum: number, r) => sum + ((r.purchase_cost as number | null) ?? 0),
        0
      )

      const statusMap = new Map<string, number>()
      for (const r of rows) {
        const s = r.status as string
        statusMap.set(s, (statusMap.get(s) ?? 0) + 1)
      }
      const byStatus: StatusBreakdown[] = Array.from(statusMap.entries()).map(
        ([status, count]) => ({ status: status as StatusBreakdown['status'], count })
      )

      const deptMap = new Map<string, { name: string; count: number; value: number }>()
      for (const r of rows) {
        const deptId = (r.department_id as string | null) ?? '__none__'
        const deptName = (r.departments as { name: string } | null)?.name ?? 'Unassigned'
        const existing = deptMap.get(deptId) ?? { name: deptName, count: 0, value: 0 }
        deptMap.set(deptId, {
          name: deptName,
          count: existing.count + 1,
          value: existing.value + ((r.purchase_cost as number | null) ?? 0),
        })
      }
      const byDepartment: DepartmentBreakdown[] = Array.from(deptMap.entries())
        .map(([departmentId, { name, count, value }]) => ({
          departmentId,
          departmentName: name,
          count,
          value,
        }))
        .toSorted((a, b) => b.count - a.count)

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
