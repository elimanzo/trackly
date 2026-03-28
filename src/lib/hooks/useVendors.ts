import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createVendor, deleteVendor, updateVendor } from '@/app/actions/vendors'
import { createClient } from '@/lib/supabase/client'
import type { Vendor, VendorFormInput } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

export const vendorKeys = {
  all: (orgId: string) => ['vendors', orgId] as const,
}

type Row = Record<string, unknown>

async function fetchVendors(orgId: string): Promise<Vendor[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('name')
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map((r) => ({
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
}

export function useVendors() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? ''
  const query = useQuery({
    queryKey: vendorKeys.all(orgId),
    queryFn: () => fetchVendors(orgId),
    enabled: Boolean(orgId),
    staleTime: 60_000,
  })
  return { data: query.data ?? [], isLoading: query.isLoading }
}

export function useVendorMutations() {
  const { user } = useAuth()
  const orgId = user?.orgId ?? ''
  const queryClient = useQueryClient()
  const invalidate = () => {
    if (orgId) void queryClient.invalidateQueries({ queryKey: vendorKeys.all(orgId) })
  }

  const createMut = useMutation({
    mutationFn: async (input: VendorFormInput) => {
      const result = await createVendor(input)
      if ('error' in result) throw new Error(result.error)
      return result.id
    },
    onSuccess: () => {
      toast.success('Vendor created')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMut = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VendorFormInput }) => {
      const result = await updateVendor(id, input)
      if (result?.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Vendor updated')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteVendor(id)
      if (result?.error) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Vendor deleted')
      invalidate()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    create: async (input: VendorFormInput): Promise<string | null> => {
      try {
        return await createMut.mutateAsync(input)
      } catch {
        return null
      }
    },
    update: (id: string, input: VendorFormInput) => updateMut.mutate({ id, input }),
    remove: (id: string) => deleteMut.mutate(id),
    isPending: createMut.isPending || updateMut.isPending || deleteMut.isPending,
  }
}
