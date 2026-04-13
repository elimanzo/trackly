import { useQuery } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import type { AuditLog } from '@/lib/types'
import { useOrg } from '@/providers/OrgProvider'

function mapLog(r: Record<string, unknown>): AuditLog {
  return {
    id: r.id as string,
    orgId: r.org_id as string,
    actorId: (r.actor_id as string) ?? '',
    actorName: r.actor_name as string,
    entityType: r.entity_type as AuditLog['entityType'],
    entityId: r.entity_id as string,
    entityName: r.entity_name as string,
    action: r.action as AuditLog['action'],
    changes: (r.changes as AuditLog['changes']) ?? null,
    createdAt: r.created_at as string,
  }
}

export function useRecentActivity(
  limit = 10,
  enabled = true
): { data: AuditLog[]; isLoading: boolean } {
  const { org } = useOrg()
  const orgId = org?.id ?? ''

  const { data = [], isLoading } = useQuery({
    queryKey: ['recentActivity', orgId, limit],
    enabled: !!orgId && enabled,
    queryFn: async () => {
      const { data: rows } = await createClient()
        .from('audit_logs')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit)
      return (rows ?? []).map(mapLog)
    },
    staleTime: 30_000,
  })

  return { data, isLoading }
}

export function useAssetHistory(assetId: string): {
  data: AuditLog[]
  isLoading: boolean
} {
  const { org } = useOrg()
  const orgId = org?.id ?? ''

  const { data = [], isLoading } = useQuery({
    queryKey: ['assetHistory', assetId],
    enabled: !!orgId && !!assetId,
    queryFn: async () => {
      const { data: rows } = await createClient()
        .from('audit_logs')
        .select('*')
        .eq('org_id', orgId)
        .eq('entity_id', assetId)
        .order('created_at', { ascending: false })
      return (rows ?? []).map(mapLog)
    },
    staleTime: 30_000,
  })

  return { data, isLoading }
}
