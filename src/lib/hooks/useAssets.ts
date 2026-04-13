import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { getNextTagForPrefix } from '@/app/actions/assets'
import { ASSET_TAG_PREFIX } from '@/lib/constants'
import { applyDepartmentConstraint, createPolicy } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'
import type {
  AssetAssignment,
  AssetStatus,
  BulkAsset,
  SerializedAsset,
  TypedAsset,
} from '@/lib/types'
import { ASSET_STATUS_LABELS } from '@/lib/types/asset'
import { computeAvailable } from '@/lib/utils/availability'
import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

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

type RelationName = { name: string } | null

type AssetRow = {
  id: string
  org_id: string
  asset_tag: string
  name: string
  is_bulk: boolean
  quantity: number | null
  category_id: string | null
  department_id: string | null
  location_id: string | null
  vendor_id: string | null
  status: string
  purchase_date: string | null
  purchase_cost: number | null
  warranty_expiry: string | null
  notes: string | null
  deleted_at: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  departments: RelationName
  categories: RelationName
  locations: RelationName
  vendors: RelationName
  asset_assignments: AssignmentRow[]
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

export function mapAssetRow(row: AssetRow): TypedAsset {
  const activeRows = row.asset_assignments.filter((a) => a.returned_at === null)
  const activeAssignments = activeRows.map((a) => mapAssignment(a, row.id))

  const assigneeSummary: string | null = (() => {
    if (activeAssignments.length === 0) return null
    // Safe: guarded by length check above
    const first = activeAssignments[0]!.assignedToName
    const extra = activeAssignments.length - 1
    return extra > 0 ? `${first} +${extra} other${extra > 1 ? 's' : ''}` : first
  })()

  const base = {
    id: row.id,
    orgId: row.org_id,
    assetTag: row.asset_tag,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    departmentId: row.department_id,
    departmentName: row.departments?.name ?? null,
    locationId: row.location_id,
    locationName: row.locations?.name ?? null,
    status: row.status as SerializedAsset['status'],
    purchaseDate: row.purchase_date,
    purchaseCost: row.purchase_cost,
    warrantyExpiry: row.warranty_expiry,
    vendorId: row.vendor_id,
    vendorName: row.vendors?.name ?? null,
    notes: row.notes,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    isCheckedOut: activeAssignments.length > 0,
    assigneeSummary,
  }

  if (row.is_bulk) {
    const qty = row.quantity ?? 0
    const quantityCheckedOut = activeAssignments.reduce((sum, a) => sum + a.quantity, 0)
    const available = computeAvailable(qty, quantityCheckedOut)
    return {
      ...base,
      isBulk: true,
      quantity: qty,
      available,
      quantityCheckedOut,
      activeAssignments,
      isAvailable: available > 0,
      statusLabel: `${available}/${qty} avail.`,
      ui: {
        statusBadgeText: `${available}/${qty} avail.`,
        checkoutLabel: 'items',
        checkoutSubtitle: `— ${available} available`,
        availableQty: available,
        assignmentTabLabel: `Checked out (${activeAssignments.length})`,
        secondaryAction: 'restock',
        assignments: activeAssignments,
      },
    } satisfies BulkAsset
  }

  const currentAssignment = activeAssignments[0] ?? null
  return {
    ...base,
    isBulk: false,
    quantity: null,
    currentAssignment,
    isAvailable: activeAssignments.length === 0,
    statusLabel: ASSET_STATUS_LABELS[row.status as AssetStatus],
    ui: {
      statusBadgeText: null,
      checkoutLabel: 'asset',
      checkoutSubtitle: `— ${base.assetTag}`,
      availableQty: null,
      assignmentTabLabel: 'Assignment',
      secondaryAction: row.status === 'checked_out' ? 'return' : null,
      assignments: currentAssignment ? [currentAssignment] : [],
    },
  } satisfies SerializedAsset
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
  data: TypedAsset[]
  totalCount: number
  isLoading: boolean
  isError: boolean
  refresh: () => void
}

export function useAssets(filters: AssetFilters = {}, page = 1, pageSize = 25): PaginatedAssets {
  const { org, role, departmentIds } = useOrg()
  const orgId = org?.id ?? ''
  const queryClient = useQueryClient()

  const queryKey = [
    'assets',
    orgId,
    role,
    departmentIds.join(','),
    filters.search,
    filters.status,
    filters.departmentId,
    filters.categoryId,
    page,
    pageSize,
  ]

  const { data, isLoading, isError } = useQuery({
    queryKey,
    enabled: !!orgId,
    queryFn: async () => {
      const supabase = createClient()

      let query = supabase
        .from('assets')
        .select(ASSET_SELECT, { count: 'exact' })
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (filters.search) {
        const { data: ids } = await supabase.rpc('search_asset_ids', {
          p_org_id: orgId,
          p_search: filters.search,
        })
        if (!ids || ids.length === 0) return { rows: [], count: 0 }
        query = query.in('id', ids as string[])
      }

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.departmentId) query = query.eq('department_id', filters.departmentId)
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId)

      query = applyDepartmentConstraint(
        query,
        createPolicy({ role: role ?? 'viewer', departmentIds }).queryConstraint()
      )

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      const { data: rows, count, error } = await query.range(from, to)

      if (error || !rows) return { rows: [], count: 0 }
      return { rows: rows as unknown as AssetRow[], count: count ?? 0 }
    },
    staleTime: 30_000,
  })

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
    [queryClient]
  )

  return {
    data: (data?.rows ?? []).map(mapAssetRow),
    totalCount: data?.count ?? 0,
    isLoading,
    isError,
    refresh,
  }
}

// ---------------------------------------------------------------------------
// useAsset — single asset by ID
// ---------------------------------------------------------------------------

export function useAsset(id: string): {
  data: TypedAsset | null
  isLoading: boolean
  isError: boolean
  refresh: () => void
} {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['asset', id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const supabase = createClient()
      const { data: row, error } = await supabase
        .from('assets')
        .select(ASSET_SELECT)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (error || !row) return null
      return mapAssetRow(row as unknown as AssetRow)
    },
    staleTime: 30_000,
  })

  // Invalidate the asset, its history, recent activity, and dashboard stats
  const refresh = useCallback(() => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['asset', id] }),
      queryClient.invalidateQueries({ queryKey: ['assetHistory', id] }),
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }),
    ])
  }, [queryClient, id])

  return { data: data ?? null, isLoading, isError, refresh }
}

// ---------------------------------------------------------------------------
// useNextAssetTag — max-based suggestion for the default "AST" prefix
// ---------------------------------------------------------------------------

export function useNextAssetTag(): string {
  const { membership } = useOrg()
  const orgSlug = membership?.orgSlug ?? ''
  const { data: tag = 'AST-0001' } = useQuery({
    queryKey: ['nextAssetTag', orgSlug],
    queryFn: () => getNextTagForPrefix(orgSlug, ASSET_TAG_PREFIX),
    enabled: !!orgSlug,
    staleTime: 0, // Always fresh — tag must not be stale
  })

  return tag
}
