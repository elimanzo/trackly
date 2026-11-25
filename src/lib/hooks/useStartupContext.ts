'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { asStartupClient, startupContextQueryOptions } from '@/lib/startup'
import { createClient } from '@/lib/supabase/client'

/**
 * Cache the shell context (profile, memberships, departments) in React Query so
 * client-side navigations reuse it across clicks instead of refetching on every
 * navigation. Keyed by userId with a stale window; realtime invalidation busts
 * it when the underlying rows change.
 */
export function useStartupContext(userId: string | null) {
  const client = useMemo(() => asStartupClient(createClient()), [])

  return useQuery({
    ...startupContextQueryOptions(client, userId ?? ''),
    enabled: userId != null,
  })
}
