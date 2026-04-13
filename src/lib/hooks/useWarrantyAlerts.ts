import { useQuery } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import type { WarrantyAlert } from '@/lib/types'
import { useOrg } from '@/providers/OrgProvider'

export function useWarrantyAlerts(limit = 8, enabled = true) {
  const { org } = useOrg()
  const orgId = org?.id

  const { data = [], isLoading } = useQuery({
    queryKey: ['warrantyAlerts', orgId, limit],
    enabled: orgId != null && enabled,
    queryFn: async () => {
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data: rows } = await createClient()
        .from('assets')
        .select('id, asset_tag, name, warranty_expiry, departments(name)')
        .eq('org_id', orgId!)
        .is('deleted_at', null)
        .not('warranty_expiry', 'is', null)
        .lte('warranty_expiry', thirtyDays)
        .order('warranty_expiry')
        .limit(limit)

      const now = new Date()
      return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
        assetId: r.id as string,
        assetTag: r.asset_tag as string,
        assetName: r.name as string,
        departmentName: (r.departments as { name: string } | null)?.name ?? null,
        warrantyExpiry: r.warranty_expiry as string,
        daysRemaining: Math.ceil(
          (new Date(r.warranty_expiry as string).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })) satisfies WarrantyAlert[]
    },
    staleTime: 60_000,
  })

  return { data, isLoading }
}
