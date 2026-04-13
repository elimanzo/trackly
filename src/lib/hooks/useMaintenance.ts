import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { createPolicy } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import type { MaintenanceEvent, MaintenanceStatus, MaintenanceType } from '@/lib/types/maintenance'
import { useOrg } from '@/providers/OrgProvider'

type MaintenanceEventRow = {
  id: string
  org_id: string
  asset_id: string
  title: string
  type: string
  status: string
  scheduled_date: string
  started_at: string | null
  completed_at: string | null
  cost: number | null
  technician_name: string | null
  notes: string | null
  created_by: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

function mapEvent(r: MaintenanceEventRow): MaintenanceEvent {
  return {
    id: r.id,
    orgId: r.org_id,
    assetId: r.asset_id,
    title: r.title,
    type: r.type as MaintenanceEvent['type'],
    status: r.status as MaintenanceEvent['status'],
    scheduledDate: r.scheduled_date,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    cost: r.cost,
    technicianName: r.technician_name,
    notes: r.notes,
    createdBy: r.created_by,
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function useAssetMaintenanceEvents(assetId: string): {
  data: MaintenanceEvent[]
  isLoading: boolean
  isError: boolean
  refresh: () => void
} {
  const { org } = useOrg()
  const orgId = org?.id ?? ''
  const queryClient = useQueryClient()

  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['maintenanceEvents', assetId],
    enabled: !!orgId && !!assetId,
    queryFn: async () => {
      const { data: rows } = await createClient()
        .from('maintenance_events')
        .select('*')
        .eq('asset_id', assetId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      return ((rows ?? []) as MaintenanceEventRow[]).map(mapEvent)
    },
    staleTime: 30_000,
  })

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['maintenanceEvents', assetId] })
  }, [queryClient, assetId])

  return { data, isLoading, isError, refresh }
}

// ---------------------------------------------------------------------------
// useMaintenanceList — org-wide list (global maintenance page)
// ---------------------------------------------------------------------------

export type MaintenanceListFilters = {
  status?: MaintenanceStatus | ''
  type?: MaintenanceType | ''
  dateFrom?: string
  dateTo?: string
}

export type MaintenanceListItem = MaintenanceEvent & {
  assetName: string
  assetTag: string
  departmentName: string | null
}

export function useMaintenanceList(filters: MaintenanceListFilters = {}): {
  data: MaintenanceListItem[]
  isLoading: boolean
  isError: boolean
  refresh: () => void
} {
  const { org, role, departmentIds } = useOrg()
  const orgId = org?.id ?? ''
  const queryClient = useQueryClient()

  const constraint = createPolicy({ role: role ?? 'viewer', departmentIds }).queryConstraint()

  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      'maintenanceList',
      orgId,
      role,
      departmentIds.join(','),
      filters.status,
      filters.type,
      filters.dateFrom,
      filters.dateTo,
    ],
    enabled: !!orgId,
    queryFn: async () => {
      const supabase = createClient()

      // Short-circuit: no department assignments → nothing visible
      if (constraint.kind === 'none') return []

      // For department-scoped roles, resolve allowed asset IDs first
      let allowedAssetIds: string[] | null = null
      if (constraint.kind === 'in') {
        const { data: assets } = await supabase
          .from('assets')
          .select('id')
          .eq('org_id', orgId)
          .is('deleted_at', null)
          .in('department_id', constraint.ids)
        const ids = ((assets ?? []) as { id: string }[]).map((a) => a.id)
        if (ids.length === 0) return []
        allowedAssetIds = ids
      }

      let query = supabase
        .from('maintenance_events')
        .select('*, assets!inner(name, asset_tag, departments(name))')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: false })

      if (allowedAssetIds !== null) query = query.in('asset_id', allowedAssetIds)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.type) query = query.eq('type', filters.type)
      if (filters.dateFrom) query = query.gte('scheduled_date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('scheduled_date', filters.dateTo)

      const { data: rows } = await query

      type MaintenanceListRow = MaintenanceEventRow & {
        assets: {
          name: string
          asset_tag: string
          departments: { name: string } | null
        }
      }

      return ((rows ?? []) as MaintenanceListRow[]).map((r) => ({
        ...mapEvent(r),
        assetName: r.assets.name,
        assetTag: r.assets.asset_tag,
        departmentName: r.assets.departments?.name ?? null,
      }))
    },
    staleTime: 30_000,
  })

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['maintenanceList'] })
  }, [queryClient])

  return { data, isLoading, isError, refresh }
}
