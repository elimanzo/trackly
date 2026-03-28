import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createLocation, deleteLocation, updateLocation } from '@/app/actions/locations'
import { createClient } from '@/lib/supabase/client'
import type { Location, LocationFormInput } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

export const locationKeys = {
  all: (orgId: string) => ['locations', orgId] as const,
}

type Row = Record<string, unknown>

async function fetchLocations(orgId: string): Promise<Location[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('locations')
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
  }))
}

export function useLocations() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? ''
  const query = useQuery({
    queryKey: locationKeys.all(orgId),
    queryFn: () => fetchLocations(orgId),
    enabled: Boolean(orgId),
    staleTime: 60_000,
  })
  return { data: query.data ?? [], isLoading: query.isLoading }
}

export function useLocationMutations() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? ''
  const queryClient = useQueryClient()
  const invalidate = () => {
    if (orgId) void queryClient.invalidateQueries({ queryKey: locationKeys.all(orgId) })
  }

  const createMut = useMutation({
    mutationFn: async (input: LocationFormInput) => {
      const result = await createLocation(input)
      if ('error' in result) throw new Error(result.error)
      return result.id
    },
    onSuccess: () => {
      toast.success('Location created')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMut = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: LocationFormInput }) => {
      const result = await updateLocation(id, input)
      if (result?.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Location updated')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteLocation(id)
      if (result?.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Location deleted')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    create: async (input: LocationFormInput): Promise<string | null> => {
      try {
        return await createMut.mutateAsync(input)
      } catch {
        return null
      }
    },
    update: (id: string, input: LocationFormInput) => updateMut.mutate({ id, input }),
    remove: (id: string) => deleteMut.mutate(id),
    isPending: createMut.isPending || updateMut.isPending || deleteMut.isPending,
  }
}
