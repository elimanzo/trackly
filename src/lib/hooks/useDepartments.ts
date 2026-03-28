import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createDepartment, deleteDepartment, updateDepartment } from '@/app/actions/departments'
import { createClient } from '@/lib/supabase/client'
import type { Department, DepartmentFormInput } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

export const departmentKeys = {
  all: (orgId: string) => ['departments', orgId] as const,
}

type Row = Record<string, unknown>

async function fetchDepartments(orgId: string): Promise<Department[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('name')
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id as string,
    orgId: r.org_id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    deletedAt: (r.deleted_at as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))
}

export function useDepartments() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? ''
  const query = useQuery({
    queryKey: departmentKeys.all(orgId),
    queryFn: () => fetchDepartments(orgId),
    enabled: Boolean(orgId),
    staleTime: 60_000,
  })
  return { data: query.data ?? [], isLoading: query.isLoading }
}

export function useDepartmentMutations() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? ''
  const queryClient = useQueryClient()
  const invalidate = () => {
    if (orgId) void queryClient.invalidateQueries({ queryKey: departmentKeys.all(orgId) })
  }

  const createMut = useMutation({
    mutationFn: async (input: DepartmentFormInput) => {
      const result = await createDepartment(input)
      if ('error' in result) throw new Error(result.error)
      return result.id
    },
    onSuccess: () => {
      toast.success('Department created')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMut = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DepartmentFormInput }) => {
      const result = await updateDepartment(id, input)
      if (result?.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Department updated')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteDepartment(id)
      if (result?.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Department deleted')
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['assets'] })
      void queryClient.invalidateQueries({ queryKey: ['asset'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    create: async (input: DepartmentFormInput): Promise<string | null> => {
      try {
        return await createMut.mutateAsync(input)
      } catch {
        return null
      }
    },
    update: (id: string, input: DepartmentFormInput) => updateMut.mutate({ id, input }),
    remove: (id: string) => deleteMut.mutate(id),
    isPending: createMut.isPending || updateMut.isPending || deleteMut.isPending,
  }
}
