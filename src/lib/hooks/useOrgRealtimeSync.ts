'use client'

import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/providers/OrgProvider'

import { invalidateForTable, type AppTable } from './queryInvalidation'

/**
 * Tables carrying an `org_id` column, which can be filtered server-side.
 *
 * A `filter: org_id=eq.<uuid>` naming a column the table does not have is
 * rejected by the realtime server. Bindings are validated as a *set* when the
 * channel joins, so one bad filter rolls back every subscription on the
 * channel — while `.subscribe()` still reports SUBSCRIBED. No events are ever
 * delivered and nothing surfaces client-side. Keep this list in sync with the
 * schema; `profiles` and `asset_assignments` have no `org_id`.
 */
const ORG_SCOPED_TABLES = [
  'departments',
  'categories',
  'locations',
  'vendors',
  'invites',
  'assets',
  'audit_logs',
] as const satisfies readonly AppTable[]

/**
 * Tables without an `org_id` column. Subscribed unfiltered — RLS still limits
 * delivery to rows the subscriber may read, so this leaks no cross-org data;
 * it only costs an occasional redundant invalidation.
 */
const UNSCOPED_TABLES = [
  'profiles',
  'user_departments',
  'asset_assignments',
] as const satisfies readonly AppTable[]

export function OrgRealtimeSync() {
  const { org } = useOrg()
  const orgId = org?.id ?? null
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!orgId) return

    const supabase = createClient()
    const on = (table: AppTable) => () => invalidateForTable(queryClient, orgId, table)

    let channel = supabase.channel(`org-realtime-${orgId}`)

    for (const table of ORG_SCOPED_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `org_id=eq.${orgId}` },
        on(table)
      )
    }

    for (const table of UNSCOPED_TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, on(table))
    }

    // Params annotated explicitly: reassigning `channel` in the loops above
    // widens its type and drops the inferred callback signature.
    channel.subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`, err?: Error) => {
      // Realtime fails silently: a rejected binding still yields SUBSCRIBED on
      // some paths, and a dropped channel is invisible to the user — the UI
      // just quietly stops updating. Surface it in development.
      if (process.env.NODE_ENV !== 'production' && status !== 'SUBSCRIBED') {
        console.warn(`[realtime] channel org-realtime-${orgId}: ${status}`, err ?? '')
      }
    })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, queryClient])

  return null
}
