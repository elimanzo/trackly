import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/AuthProvider'

import { categoryKeys } from './useCategories'
import { departmentKeys } from './useDepartments'
import { locationKeys } from './useLocations'
import { orgUserKeys } from './useOrgUsers'
import { vendorKeys } from './useVendors'

export function OrgRealtimeSync() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? null
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

    const invalidateAssets = () => {
      void queryClient.invalidateQueries({ queryKey: ['assets'] })
      void queryClient.invalidateQueries({ queryKey: ['asset'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    }

    const channel = supabase
      .channel(`org-realtime-${orgId}`)
      .on('postgres_changes', filter('departments'), () => {
        void queryClient.invalidateQueries({ queryKey: departmentKeys.all(orgId) })
        invalidateAssets()
      })
      .on('postgres_changes', filter('categories'), () => {
        void queryClient.invalidateQueries({ queryKey: categoryKeys.all(orgId) })
        invalidateAssets()
      })
      .on('postgres_changes', filter('locations'), () => {
        void queryClient.invalidateQueries({ queryKey: locationKeys.all(orgId) })
      })
      .on('postgres_changes', filter('vendors'), () => {
        void queryClient.invalidateQueries({ queryKey: vendorKeys.all(orgId) })
      })
      .on('postgres_changes', filter('profiles'), () => {
        void queryClient.invalidateQueries({ queryKey: orgUserKeys.all(orgId) })
      })
      .on('postgres_changes', filter('invites'), () => {
        void queryClient.invalidateQueries({ queryKey: orgUserKeys.all(orgId) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_departments' }, () => {
        void queryClient.invalidateQueries({ queryKey: orgUserKeys.all(orgId) })
      })
      .on('postgres_changes', filter('assets'), invalidateAssets)
      .on('postgres_changes', filter('audit_logs'), () => {
        void queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
        void queryClient.invalidateQueries({ queryKey: ['assetHistory'] })
        void queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, queryClient])

  return null
}
