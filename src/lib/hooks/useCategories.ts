import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createCategory, deleteCategory, updateCategory } from '@/app/actions/categories'
import { createClient } from '@/lib/supabase/client'
import type { Category, CategoryFormInput } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

export const categoryKeys = {
  all: (orgId: string) => ['categories', orgId] as const,
}

type Row = Record<string, unknown>

async function fetchCategories(orgId: string): Promise<Category[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
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
    icon: (r.icon as string | null) ?? null,
    deletedAt: (r.deleted_at as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))
}

export function useCategories() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? ''
  const query = useQuery({
    queryKey: categoryKeys.all(orgId),
    queryFn: () => fetchCategories(orgId),
    enabled: Boolean(orgId),
    staleTime: 60_000,
  })
  return { data: query.data ?? [], isLoading: query.isLoading }
}

export function useCategoryMutations() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? ''
  const queryClient = useQueryClient()
  const invalidate = () => {
    if (orgId) void queryClient.invalidateQueries({ queryKey: categoryKeys.all(orgId) })
  }

  const createMut = useMutation({
    mutationFn: async (input: CategoryFormInput) => {
      const result = await createCategory(input)
      if ('error' in result) throw new Error(result.error)
      return result.id
    },
    onSuccess: () => {
      toast.success('Category created')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMut = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CategoryFormInput }) => {
      const result = await updateCategory(id, input)
      if (result?.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Category updated')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCategory(id)
      if (result?.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Category deleted')
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['assets'] })
      void queryClient.invalidateQueries({ queryKey: ['asset'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    create: async (input: CategoryFormInput): Promise<string | null> => {
      try {
        return await createMut.mutateAsync(input)
      } catch {
        return null
      }
    },
    update: (id: string, input: CategoryFormInput) => updateMut.mutate({ id, input }),
    remove: (id: string) => deleteMut.mutate(id),
    isPending: createMut.isPending || updateMut.isPending || deleteMut.isPending,
  }
}
