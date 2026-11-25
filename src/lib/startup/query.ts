import { loadStartupContext } from './load'
import type { StartupClient, StartupContext } from './ports'

/**
 * How long the shell context (profile, memberships, departments) is considered
 * fresh. Client-side navigations within this window reuse the cache instead of
 * refetching the shell on every click. Staleness is a backstop — realtime
 * invalidation (see queryInvalidation.ts) busts the cache the instant the
 * underlying rows change, so this can be generous.
 */
export const STARTUP_STALE_TIME = 5 * 60 * 1000

export const startupKeys = {
  /** Shell context is per-user, not per-org: the same across every org switch. */
  context: (userId: string) => ['startupContext', userId] as const,
}

/**
 * React Query options for the shell context. Shared by the `useStartupContext`
 * hook and tested directly against a real QueryClient — the public seam where
 * no-refetch-within-the-stale-window behavior is observable.
 */
export function startupContextQueryOptions(client: StartupClient, userId: string) {
  return {
    queryKey: startupKeys.context(userId),
    queryFn: (): Promise<StartupContext> => loadStartupContext(client, userId),
    staleTime: STARTUP_STALE_TIME,
  }
}
