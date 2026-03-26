import { useCallback, useEffect, useState } from 'react'

import { getAssetCount } from '@/app/actions/assets'
import { createClient } from '@/lib/supabase/client'
import type { AssetAssignment, AssetStatus, AssetWithRelations } from '@/lib/types'
import { generateAssetTag } from '@/lib/utils/formatters'
import { canManage } from '@/lib/utils/permissions'
import { useAuth } from '@/providers/AuthProvider'

export type AssetFilters = {
  search?: string
  status?: AssetStatus | ''
  departmentId?: string
  categoryId?: string
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

type AssignmentRow = {
  id: string
  assigned_to_user_id: string | null
  assigned_to_name: string
  assigned_by: string
  assigned_by_name: string
  assigned_at: string
  expected_return_at: string | null
  returned_at: string | null
  notes: string | null
  quantity: number
  department_id: string | null
  departments: { name: string } | null
  location_id: string | null
  locations: { name: string } | null
}

function mapAssignment(a: AssignmentRow, assetId: string): AssetAssignment {
  return {
    id: a.id,
    assetId,
    assignedToUserId: a.assigned_to_user_id,
    assignedToName: a.assigned_to_name,
    assignedBy: a.assigned_by,
    assignedByName: a.assigned_by_name,
    assignedAt: a.assigned_at,
    expectedReturnAt: a.expected_return_at,
    returnedAt: a.returned_at,
    notes: a.notes,
    quantity: a.quantity ?? 1,
    departmentId: a.department_id ?? null,
    departmentName: a.departments?.name ?? null,
    locationId: a.location_id ?? null,
    locationName: a.locations?.name ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAssetRow(row: any): AssetWithRelations {
  const assignments: AssignmentRow[] = row.asset_assignments ?? []
  const activeRows = assignments.filter((a) => a.returned_at === null)
  const activeAssignments = activeRows.map((a) => mapAssignment(a, row.id as string))
  const quantityCheckedOut = activeAssignments.reduce((sum, a) => sum + a.quantity, 0)

  return {
    id: row.id as string,
    orgId: row.org_id as string,
    assetTag: row.asset_tag as string,
    name: row.name as string,
    isBulk: (row.is_bulk as boolean) ?? false,
    quantity: (row.quantity as number | null) ?? null,
    categoryId: (row.category_id as string | null) ?? null,
    categoryName: (row.categories as { name: string } | null)?.name ?? null,
    departmentId: (row.department_id as string | null) ?? null,
    departmentName: (row.departments as { name: string } | null)?.name ?? null,
    locationId: (row.location_id as string | null) ?? null,
    locationName: (row.locations as { name: string } | null)?.name ?? null,
    status: row.status as AssetWithRelations['status'],
    purchaseDate: (row.purchase_date as string | null) ?? null,
    purchaseCost: (row.purchase_cost as number | null) ?? null,
    warrantyExpiry: (row.warranty_expiry as string | null) ?? null,
    vendorId: (row.vendor_id as string | null) ?? null,
    vendorName: (row.vendors as { name: string } | null)?.name ?? null,
    notes: (row.notes as string | null) ?? null,
    deletedAt: (row.deleted_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: (row.created_by as string) ?? '',
    updatedBy: (row.updated_by as string) ?? '',
    quantityCheckedOut,
    activeAssignments,
    currentAssignment: activeAssignments[0] ?? null,
  }
}

const ASSET_SELECT = `
  id, org_id, asset_tag, name, is_bulk, quantity,
  category_id, department_id, location_id, status,
  purchase_date, purchase_cost, warranty_expiry, vendor_id, notes,
  deleted_at, created_by, updated_by, created_at, updated_at,
  departments(name),
  categories(name),
  locations(name),
  vendors(name),
  asset_assignments(
    id, assigned_to_user_id, assigned_to_name,
    assigned_by, assigned_by_name, assigned_at,
    expected_return_at, returned_at, notes,
    quantity, department_id, location_id,
    departments(name), locations(name)
  )
`

// ---------------------------------------------------------------------------
// useAssets — paginated list
// ---------------------------------------------------------------------------

export type PaginatedAssets = {
  data: AssetWithRelations[]
  totalCount: number
  isLoading: boolean
  refresh: () => void
}

export function useAssets(filters: AssetFilters = {}, page = 1, pageSize = 25): PaginatedAssets {
  const { user } = useAuth()
  const [data, setData] = useState<AssetWithRelations[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user?.orgId) return

    let cancelled = false

    async function fetchAssets() {
      setIsLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('assets')
        .select(ASSET_SELECT, { count: 'exact' })
        .eq('org_id', user!.orgId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (filters.search) {
        const { data: ids } = await supabase.rpc('search_asset_ids', {
          p_org_id: user!.orgId!,
          p_search: filters.search,
        })
        if (!ids || ids.length === 0) {
          if (!cancelled) {
            setData([])
            setTotalCount(0)
            setIsLoading(false)
          }
          return
        }
        query = query.in('id', ids as string[])
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.departmentId) {
        query = query.eq('department_id', filters.departmentId)
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      // Scope editors/viewers to their assigned departments
      if (!canManage(user!.role)) {
        if (user!.departmentIds.length > 0) {
          query = query.in('department_id', user!.departmentIds)
        } else {
          // No departments assigned — show nothing
          query = query.eq('department_id', '00000000-0000-0000-0000-000000000000')
        }
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data: rows, count, error } = await query.range(from, to)

      if (cancelled || error || !rows) {
        if (!cancelled) setIsLoading(false)
        return
      }

      setData(rows.map(mapAssetRow))
      setTotalCount(count ?? 0)
      setIsLoading(false)
    }

    fetchAssets().catch(() => {
      if (!cancelled) setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.orgId,
    user?.role,
    JSON.stringify(user?.departmentIds),
    filters.search,
    filters.status,
    filters.departmentId,
    filters.categoryId,
    page,
    pageSize,
    refreshKey,
  ])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { data, totalCount, isLoading, refresh }
}

// ---------------------------------------------------------------------------
// useAsset — single asset by ID
// ---------------------------------------------------------------------------

export function useAsset(id: string): {
  data: AssetWithRelations | null
  isLoading: boolean
  refresh: () => void
} {
  const { user } = useAuth()
  const [data, setData] = useState<AssetWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false

    async function fetchAsset() {
      setIsLoading(true)
      const supabase = createClient()
      const { data: row, error } = await supabase
        .from('assets')
        .select(ASSET_SELECT)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (cancelled) return
      if (error || !row) {
        setData(null)
        setIsLoading(false)
        return
      }
      setData(mapAssetRow(row))
      setIsLoading(false)
    }

    fetchAsset().catch(() => {
      if (!cancelled) setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [id, user?.id, refreshKey])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { data, isLoading, refresh }
}

// ---------------------------------------------------------------------------
// useNextAssetTag — generates the next tag based on total asset count
// ---------------------------------------------------------------------------

export function useNextAssetTag(): string {
  const [tag, setTag] = useState('AST-00001')

  useEffect(() => {
    getAssetCount().then((count) => {
      setTag(generateAssetTag(count + 1))
    })
  }, [])

  return tag
}
