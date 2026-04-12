import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { MaintenanceEvent } from '@/lib/types/maintenance'
import { useOrg } from '@/providers/OrgProvider'

function mapEvent(r: Record<string, unknown>): MaintenanceEvent {
  return {
    id: r.id as string,
    orgId: r.org_id as string,
    assetId: r.asset_id as string,
    title: r.title as string,
    type: r.type as MaintenanceEvent['type'],
    status: r.status as MaintenanceEvent['status'],
    scheduledDate: r.scheduled_date as string,
    startedAt: (r.started_at as string) ?? null,
    completedAt: (r.completed_at as string) ?? null,
    cost: (r.cost as number) ?? null,
    technicianName: (r.technician_name as string) ?? null,
    notes: (r.notes as string) ?? null,
    createdBy: (r.created_by as string) ?? null,
    deletedAt: (r.deleted_at as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export function useAssetMaintenanceEvents(assetId: string): {
  data: MaintenanceEvent[]
  isLoading: boolean
  refresh: () => void
} {
  const { org } = useOrg()
  const orgId = org?.id ?? ''
  const queryClient = useQueryClient()

  const { data = [], isLoading } = useQuery({
    queryKey: ['maintenanceEvents', assetId],
    enabled: !!orgId && !!assetId,
    queryFn: async () => {
      const { data: rows } = await createClient()
        .from('maintenance_events')
        .select('*')
        .eq('asset_id', assetId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      return (rows ?? []).map(mapEvent)
    },
    staleTime: 30_000,
  })

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['maintenanceEvents', assetId] })
  }, [queryClient, assetId])

  return { data, isLoading, refresh }
}
