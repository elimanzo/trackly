'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/providers/OrgProvider'

import { invalidateForTable, type AppTable } from './queryInvalidation'

export function OrgRealtimeSync() {
  const { org } = useOrg()
  const orgId = org?.id ?? null
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!orgId) return

    const supabase = createClient()
    const filter = (table: string) => ({
      event: '*' as const,
      schema: 'public',
      table,
      filter: `org_id=eq.${orgId}`,
    })

    const on = (table: AppTable) => () => invalidateForTable(queryClient, orgId, table)

    const channel = supabase
      .channel(`org-realtime-${orgId}`)
      .on('postgres_changes', filter('departments'), on('departments'))
      .on('postgres_changes', filter('categories'), on('categories'))
      .on('postgres_changes', filter('locations'), on('locations'))
      .on('postgres_changes', filter('vendors'), on('vendors'))
      .on('postgres_changes', filter('profiles'), on('profiles'))
      .on('postgres_changes', filter('invites'), on('invites'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_departments' },
        on('user_departments')
      )
      .on('postgres_changes', filter('assets'), on('assets'))
      .on('postgres_changes', filter('audit_logs'), on('audit_logs'))
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, queryClient])

  return null
}
