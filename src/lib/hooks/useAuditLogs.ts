import { useQuery } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import type { AuditLog } from '@/lib/types'
import { useOrg } from '@/providers/OrgProvider'

type AuditLogRow = {
  id: string
  org_id: string
  actor_id: string | null
  actor_name: string
  entity_type: string
  entity_id: string
  entity_name: string
  action: string
  changes: Record<string, { old: unknown; new: unknown }> | null
  created_at: string
}

function mapLog(r: AuditLogRow): AuditLog {
  return {
    id: r.id,
    orgId: r.org_id,
    actorId: r.actor_id ?? '',
    actorName: r.actor_name,
    entityType: r.entity_type as AuditLog['entityType'],
    entityId: r.entity_id,
    entityName: r.entity_name,
    action: r.action as AuditLog['action'],
    changes: r.changes,
    createdAt: r.created_at,
  }
}

export function useRecentActivity(
  limit = 10,
  enabled = true
): { data: AuditLog[]; isLoading: boolean; isError: boolean } {
  const { org } = useOrg()
  const orgId = org?.id ?? ''

  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['recentActivity', orgId, limit],
    enabled: !!orgId && enabled,
    queryFn: async () => {
      const { data: rows } = await createClient()
        .from('audit_logs')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit)
      return ((rows ?? []) as AuditLogRow[]).map(mapLog)
    },
    staleTime: 30_000,
  })

  return { data, isLoading, isError }
}

export function useAssetHistory(assetId: string): {
  data: AuditLog[]
  isLoading: boolean
  isError: boolean
} {
  const { org } = useOrg()
  const orgId = org?.id ?? ''

  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['assetHistory', assetId],
    enabled: !!orgId && !!assetId,
    queryFn: async () => {
      const { data: rows } = await createClient()
        .from('audit_logs')
        .select('*')
        .eq('org_id', orgId)
        .eq('entity_id', assetId)
        .order('created_at', { ascending: false })
      return ((rows ?? []) as AuditLogRow[]).map(mapLog)
    },
    staleTime: 30_000,
  })

  return { data, isLoading, isError }
}
