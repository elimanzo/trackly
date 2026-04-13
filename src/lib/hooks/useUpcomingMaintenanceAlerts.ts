import { useQuery } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import type { UpcomingMaintenanceAlert } from '@/lib/types'
import { useOrg } from '@/providers/OrgProvider'

type MaintenanceRow = Record<string, unknown> & {
  assets: { asset_tag: string; name: string; departments: { name: string } | null }
}

export function useUpcomingMaintenanceAlerts(limit = 8, enabled = true) {
  const { org } = useOrg()
  const orgId = org?.id

  const { data = [], isLoading } = useQuery({
    queryKey: ['upcomingMaintenanceAlerts', orgId, limit],
    enabled: orgId != null && enabled,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data: rows } = await createClient()
        .from('maintenance_events')
        .select(
          'id, asset_id, title, scheduled_date, assets!inner(asset_tag, name, departments(name))'
        )
        .eq('org_id', orgId!)
        .eq('status', 'scheduled')
        .is('deleted_at', null)
        .gte('scheduled_date', today)
        .lte('scheduled_date', thirtyDays)
        .order('scheduled_date')
        .limit(limit)

      const now = new Date()
      return ((rows ?? []) as MaintenanceRow[]).map((r) => ({
        eventId: r.id as string,
        assetId: r.asset_id as string,
        assetTag: r.assets.asset_tag,
        assetName: r.assets.name,
        departmentName: r.assets.departments?.name ?? null,
        title: r.title as string,
        scheduledDate: r.scheduled_date as string,
        daysUntil: Math.ceil(
          (new Date(r.scheduled_date as string).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })) satisfies UpcomingMaintenanceAlert[]
    },
    staleTime: 60_000,
  })

  return { data, isLoading }
}
