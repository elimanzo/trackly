import { MOCK_DASHBOARD_STATS } from '@/lib/mock-data'
import type { DashboardStats } from '@/lib/types'

// Phase 1: returns pre-computed mock stats
// Phase 2: replace with a Supabase aggregation query / React Query fetch
export function useDashboardStats(): { data: DashboardStats; isLoading: boolean } {
  return { data: MOCK_DASHBOARD_STATS, isLoading: false }
}
