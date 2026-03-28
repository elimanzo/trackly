import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/providers/AuthProvider'

type Row = Record<string, unknown>

export type EntityHookConfig<TEntity, TFormInput> = {
  queryKey: string
  table: string
  label: string
  mapRow: (r: Row) => TEntity
  actions: {
    create: (input: TFormInput) => Promise<{ id: string } | { error: string }>
    update: (id: string, input: TFormInput) => Promise<{ error: string } | null>
    delete: (id: string) => Promise<{ error: string } | null>
  }
  onDeleteSuccess?: (queryClient: ReturnType<typeof useQueryClient>) => void
}

export function makeEntityHooks<TEntity, TFormInput>(
  config: EntityHookConfig<TEntity, TFormInput>
) {
  const { queryKey, table, label, mapRow, actions, onDeleteSuccess } = config

  const keys = {
    all: (orgId: string) => [queryKey, orgId] as const,
  }

  async function fetchEntities(orgId: string): Promise<TEntity[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('name')
    if (error) throw new Error(error.message)
    return ((data ?? []) as Row[]).map(mapRow)
  }

  function useList() {
    const { user } = useAuth()
    const orgId = user?.orgId ?? ''
    const query = useQuery({
      queryKey: keys.all(orgId),
      queryFn: () => fetchEntities(orgId),
      enabled: Boolean(orgId),
      staleTime: 60_000,
    })
    return { data: query.data ?? [], isLoading: query.isLoading }
  }

  function useMutations() {
    const { user } = useAuth()
    const orgId = user?.orgId ?? ''
    const queryClient = useQueryClient()
    const invalidate = () => {
      if (orgId) void queryClient.invalidateQueries({ queryKey: keys.all(orgId) })
    }

    const createMut = useMutation({
      mutationFn: async (input: TFormInput) => {
        const result = await actions.create(input)
        if ('error' in result) throw new Error(result.error)
        return result.id
      },
      onSuccess: () => {
        toast.success(`${label} created`)
        invalidate()
      },
      onError: (err: Error) => toast.error(err.message),
    })

    const updateMut = useMutation({
      mutationFn: async ({ id, input }: { id: string; input: TFormInput }) => {
        const result = await actions.update(id, input)
        if (result?.error) throw new Error(result.error)
      },
      onSuccess: () => {
        toast.success(`${label} updated`)
        invalidate()
      },
      onError: (err: Error) => toast.error(err.message),
    })

    const deleteMut = useMutation({
      mutationFn: async (id: string) => {
        const result = await actions.delete(id)
        if (result?.error) throw new Error(result.error)
      },
      onSuccess: () => {
        toast.success(`${label} deleted`)
        invalidate()
        onDeleteSuccess?.(queryClient)
      },
      onError: (err: Error) => toast.error(err.message),
    })

    return {
      create: async (input: TFormInput): Promise<string | null> => {
        try {
          return await createMut.mutateAsync(input)
        } catch {
          return null
        }
      },
      update: (id: string, input: TFormInput) => updateMut.mutate({ id, input }),
      remove: (id: string) => deleteMut.mutate(id),
      isPending: createMut.isPending || updateMut.isPending || deleteMut.isPending,
    }
  }

  return { keys, useList, useMutations }
}
