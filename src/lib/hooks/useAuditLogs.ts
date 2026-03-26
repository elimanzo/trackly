import { useCallback, useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { AuditLog } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

export function useRecentActivity(limit = 10): { data: AuditLog[]; isLoading: boolean } {
  const { user } = useAuth()
  const [data, setData] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.orgId) return

    let cancelled = false

    createClient()
      .from('audit_logs')
      .select('*')
      .eq('org_id', user.orgId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data: rows }: { data: Record<string, unknown>[] | null }) => {
        if (cancelled || !rows) return
        setData(rows.map(mapLog))
        setIsLoading(false)
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.orgId, limit])

  return { data, isLoading }
}

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

export function useAssetHistory(assetId: string): {
  data: AuditLog[]
  isLoading: boolean
  refresh: () => void
} {
  const { user } = useAuth()
  const [data, setData] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user?.orgId || !assetId) return

    let cancelled = false

    createClient()
      .from('audit_logs')
      .select('*')
      .eq('org_id', user.orgId)
      .eq('entity_id', assetId)
      .order('created_at', { ascending: false })
      .then(({ data: rows }: { data: Record<string, unknown>[] | null }) => {
        if (cancelled || !rows) return
        setData(rows.map(mapLog))
        setIsLoading(false)
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.orgId, assetId, refreshKey])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { data, isLoading, refresh }
}
