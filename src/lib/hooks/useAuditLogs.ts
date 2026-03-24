import { getRecentAuditLogs } from '@/lib/mock-data'
import type { AuditLog } from '@/lib/types'

// Phase 1: returns recent mock audit log entries
// Phase 2: replace with Supabase query scoped to current org
export function useRecentActivity(limit = 10): { data: AuditLog[]; isLoading: boolean } {
  return { data: getRecentAuditLogs(limit), isLoading: false }
}
