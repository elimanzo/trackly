import { useEffect, useState } from 'react'

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
        setData(
          rows.map((r) => ({
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
          }))
        )
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
