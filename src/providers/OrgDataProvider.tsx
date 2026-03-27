'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { createCategory, deleteCategory, updateCategory } from '@/app/actions/categories'
import { createDepartment, deleteDepartment, updateDepartment } from '@/app/actions/departments'
import { sendInviteAction } from '@/app/actions/invites'
import { createLocation, deleteLocation, updateLocation } from '@/app/actions/locations'
import {
  removeUserAction,
  revokeInviteAction,
  updateUserDepartmentsAction,
  updateUserRoleAction,
} from '@/app/actions/users'
import { createVendor, deleteVendor, updateVendor } from '@/app/actions/vendors'
import { createClient } from '@/lib/supabase/client'
import type {
  Category,
  CategoryFormInput,
  Department,
  DepartmentFormInput,
  Invite,
  Location,
  LocationFormInput,
  ProfileWithDepartments,
  UserRole,
  Vendor,
  VendorFormInput,
} from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

type OrgDataContextValue = {
  departments: Department[]
  createDepartment: (input: DepartmentFormInput) => Promise<string | null>
  updateDepartment: (id: string, input: DepartmentFormInput) => Promise<void>
  deleteDepartment: (id: string) => Promise<void>
  categories: Category[]
  createCategory: (input: CategoryFormInput) => Promise<string | null>
  updateCategory: (id: string, input: CategoryFormInput) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  locations: Location[]
  createLocation: (input: LocationFormInput) => Promise<string | null>
  updateLocation: (id: string, input: LocationFormInput) => Promise<void>
  deleteLocation: (id: string) => Promise<void>
  vendors: Vendor[]
  createVendor: (input: VendorFormInput) => Promise<string | null>
  updateVendor: (id: string, input: VendorFormInput) => Promise<void>
  deleteVendor: (id: string) => Promise<void>
  users: ProfileWithDepartments[]
  pendingInvites: Invite[]
  sendInvite: (email: string, role: Invite['role'], departmentIds?: string[]) => Promise<void>
  revokeInvite: (id: string) => void
  removeUser: (id: string) => void
  updateUserRole: (id: string, role: Exclude<UserRole, 'owner'>) => Promise<void>
  updateUserDepartments: (id: string, departmentIds: string[]) => Promise<void>
  isLoading: boolean
}

const OrgDataContext = createContext<OrgDataContextValue | null>(null)

export function OrgDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const orgId = user?.orgId ?? null
  const queryClient = useQueryClient()

  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [users, setUsers] = useState<ProfileWithDepartments[]>([])
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    const supabase = createClient()

    type UDRow = { department_id: string; departments: { id: string; name: string } | null }

    const [depts, cats, locs, vens, profs, invs] = await Promise.all([
      supabase
        .from('departments')
        .select('*')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('categories')
        .select('*')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('locations')
        .select('*')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('name'),
      supabase.from('vendors').select('*').eq('org_id', orgId).is('deleted_at', null).order('name'),
      supabase
        .from('profiles')
        .select('*, user_departments(department_id, departments(id, name))')
        .eq('org_id', orgId)
        .neq('invite_status', 'deactivated')
        .order('full_name'),
      supabase
        .from('invites')
        .select('*')
        .eq('org_id', orgId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString()),
    ])

    const firstError = [depts, cats, locs, vens, profs, invs].find((r) => r.error)?.error
    if (firstError) {
      console.error('[OrgDataProvider] fetch error:', firstError)
      toast.error(`Failed to load org data: ${firstError.message}`)
      setIsLoading(false)
      return
    }

    type Row = Record<string, unknown>

    setDepartments(
      ((depts.data ?? []) as Row[]).map((r) => ({
        id: r.id as string,
        orgId: r.org_id as string,
        name: r.name as string,
        description: (r.description as string | null) ?? null,
        deletedAt: (r.deleted_at as string | null) ?? null,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      }))
    )

    setCategories(
      ((cats.data ?? []) as Row[]).map((r) => ({
        id: r.id as string,
        orgId: r.org_id as string,
        name: r.name as string,
        description: (r.description as string | null) ?? null,
        icon: (r.icon as string | null) ?? null,
        deletedAt: (r.deleted_at as string | null) ?? null,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      }))
    )

    setLocations(
      ((locs.data ?? []) as Row[]).map((r) => ({
        id: r.id as string,
        orgId: r.org_id as string,
        name: r.name as string,
        description: (r.description as string | null) ?? null,
        deletedAt: (r.deleted_at as string | null) ?? null,
        createdAt: r.created_at as string,
      }))
    )

    setVendors(
      ((vens.data ?? []) as Row[]).map((r) => ({
        id: r.id as string,
        orgId: r.org_id as string,
        name: r.name as string,
        contactEmail: (r.contact_email as string | null) ?? null,
        contactPhone: (r.contact_phone as string | null) ?? null,
        website: (r.website as string | null) ?? null,
        notes: (r.notes as string | null) ?? null,
        deletedAt: (r.deleted_at as string | null) ?? null,
        createdAt: r.created_at as string,
      }))
    )

    setUsers(
      ((profs.data ?? []) as Row[]).map((r) => ({
        id: r.id as string,
        orgId: (r.org_id as string | null) ?? null,
        fullName: r.full_name as string,
        email: r.email as string,
        avatarUrl: (r.avatar_url as string | null) ?? null,
        role: r.role as ProfileWithDepartments['role'],
        inviteStatus: r.invite_status as ProfileWithDepartments['inviteStatus'],
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
        departmentIds: ((r.user_departments as UDRow[]) ?? []).map((ud) => ud.department_id),
        departmentNames: ((r.user_departments as UDRow[]) ?? []).map(
          (ud) => ud.departments?.name ?? ''
        ),
      }))
    )

    setPendingInvites(
      ((invs.data ?? []) as Row[]).map((r) => ({
        id: r.id as string,
        orgId: r.org_id as string,
        email: r.email as string,
        role: r.role as Invite['role'],
        token: r.token as string,
        invitedBy: (r.invited_by as string) ?? '',
        invitedByName: r.invited_by_name as string,
        acceptedAt: null,
        expiresAt: r.expires_at as string,
        createdAt: r.created_at as string,
      }))
    )

    setIsLoading(false)
  }, [orgId])

  useEffect(() => {
    if (!orgId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false)
      return
    }
    void refetch()
  }, [orgId, refetch])

  // Real-time: re-fetch whenever any org table changes (own mutations,
  // other sessions, or direct DB edits in the Supabase dashboard)
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

    const invalidateActivity = () => {
      void queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
      void queryClient.invalidateQueries({ queryKey: ['assetHistory'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    }

    const channel = supabase
      .channel(`org-data-${orgId}`)
      .on('postgres_changes', filter('departments'), () => void refetch())
      .on('postgres_changes', filter('categories'), () => void refetch())
      .on('postgres_changes', filter('locations'), () => void refetch())
      .on('postgres_changes', filter('vendors'), () => void refetch())
      .on('postgres_changes', filter('profiles'), () => void refetch())
      .on('postgres_changes', filter('invites'), () => void refetch())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_departments' },
        () => void refetch()
      )
      .on('postgres_changes', filter('assets'), invalidateAssets)
      .on('postgres_changes', filter('audit_logs'), invalidateActivity)
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, refetch, queryClient])

  // -------------------------------------------------------------------------
  // Departments
  // -------------------------------------------------------------------------
  const handleCreateDepartment = useCallback(
    async (input: DepartmentFormInput): Promise<string | null> => {
      const result = await createDepartment(input)
      if ('error' in result) {
        toast.error(result.error)
        return null
      }
      toast.success('Department created')
      await refetch()
      return result.id
    },
    [refetch]
  )

  const handleUpdateDepartment = useCallback(
    async (id: string, input: DepartmentFormInput) => {
      const result = await updateDepartment(id, input)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Department updated')
      await refetch()
    },
    [refetch]
  )

  const handleDeleteDepartment = useCallback(
    async (id: string) => {
      const result = await deleteDepartment(id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Department deleted')
      await refetch()
    },
    [refetch]
  )

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------
  const handleCreateCategory = useCallback(
    async (input: CategoryFormInput): Promise<string | null> => {
      const result = await createCategory(input)
      if ('error' in result) {
        toast.error(result.error)
        return null
      }
      toast.success('Category created')
      await refetch()
      return result.id
    },
    [refetch]
  )

  const handleUpdateCategory = useCallback(
    async (id: string, input: CategoryFormInput) => {
      const result = await updateCategory(id, input)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Category updated')
      await refetch()
    },
    [refetch]
  )

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      const result = await deleteCategory(id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Category deleted')
      await refetch()
    },
    [refetch]
  )

  // -------------------------------------------------------------------------
  // Locations
  // -------------------------------------------------------------------------
  const handleCreateLocation = useCallback(
    async (input: LocationFormInput): Promise<string | null> => {
      const result = await createLocation(input)
      if ('error' in result) {
        toast.error(result.error)
        return null
      }
      toast.success('Location created')
      await refetch()
      return result.id
    },
    [refetch]
  )

  const handleUpdateLocation = useCallback(
    async (id: string, input: LocationFormInput) => {
      const result = await updateLocation(id, input)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Location updated')
      await refetch()
    },
    [refetch]
  )

  const handleDeleteLocation = useCallback(
    async (id: string) => {
      const result = await deleteLocation(id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Location deleted')
      await refetch()
    },
    [refetch]
  )

  // -------------------------------------------------------------------------
  // Vendors
  // -------------------------------------------------------------------------
  const handleCreateVendor = useCallback(
    async (input: VendorFormInput): Promise<string | null> => {
      const result = await createVendor(input)
      if ('error' in result) {
        toast.error(result.error)
        return null
      }
      toast.success('Vendor created')
      await refetch()
      return result.id
    },
    [refetch]
  )

  const handleUpdateVendor = useCallback(
    async (id: string, input: VendorFormInput) => {
      const result = await updateVendor(id, input)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Vendor updated')
      await refetch()
    },
    [refetch]
  )

  const handleDeleteVendor = useCallback(
    async (id: string) => {
      const result = await deleteVendor(id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Vendor deleted')
      await refetch()
    },
    [refetch]
  )

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Users / Invites
  // -------------------------------------------------------------------------
  const sendInvite = useCallback(
    async (email: string, role: Invite['role'], departmentIds: string[] = []) => {
      const result = await sendInviteAction(email, role, departmentIds)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Invite sent to ${email}`)
      await refetch()
    },
    [refetch]
  )

  const revokeInvite = useCallback(
    async (id: string) => {
      const result = await revokeInviteAction(id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Invite revoked')
      await refetch()
    },
    [refetch]
  )

  const removeUser = useCallback(
    async (id: string) => {
      const result = await removeUserAction(id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('User removed')
      await refetch()
    },
    [refetch]
  )

  const updateUserRole = useCallback(
    async (id: string, role: Exclude<UserRole, 'owner'>) => {
      const result = await updateUserRoleAction(id, role)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Role updated')
      await refetch()
    },
    [refetch]
  )

  const updateUserDepartments = useCallback(
    async (id: string, departmentIds: string[]) => {
      const result = await updateUserDepartmentsAction(id, departmentIds)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Departments updated')
      await refetch()
    },
    [refetch]
  )

  return (
    <OrgDataContext.Provider
      value={{
        departments,
        createDepartment: handleCreateDepartment,
        updateDepartment: handleUpdateDepartment,
        deleteDepartment: handleDeleteDepartment,
        categories,
        createCategory: handleCreateCategory,
        updateCategory: handleUpdateCategory,
        deleteCategory: handleDeleteCategory,
        locations,
        createLocation: handleCreateLocation,
        updateLocation: handleUpdateLocation,
        deleteLocation: handleDeleteLocation,
        vendors,
        createVendor: handleCreateVendor,
        updateVendor: handleUpdateVendor,
        deleteVendor: handleDeleteVendor,
        users,
        pendingInvites,
        sendInvite,
        revokeInvite,
        removeUser,
        updateUserRole,
        updateUserDepartments,
        isLoading,
      }}
    >
      {children}
    </OrgDataContext.Provider>
  )
}

export function useOrgData(): OrgDataContextValue {
  const ctx = useContext(OrgDataContext)
  if (!ctx) throw new Error('useOrgData must be used within <OrgDataProvider>')
  return ctx
}
