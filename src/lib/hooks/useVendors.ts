import { createVendor, deleteVendor, updateVendor } from '@/app/actions/vendors'
import type { Vendor, VendorFormInput } from '@/lib/types'

import { makeEntityHooks } from './makeEntityHooks'
import { invalidateForTable } from './queryInvalidation'

const {
  keys: vendorKeys,
  useList,
  useMutations,
} = makeEntityHooks<Vendor, VendorFormInput>({
  queryKey: 'vendors',
  table: 'vendors',
  label: 'Vendor',
  mapRow: (r) => ({
    id: r.id as string,
    orgId: r.org_id as string,
    name: r.name as string,
    contactEmail: (r.contact_email as string | null) ?? null,
    contactPhone: (r.contact_phone as string | null) ?? null,
    website: (r.website as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    deletedAt: (r.deleted_at as string | null) ?? null,
    createdAt: r.created_at as string,
  }),
  actions: {
    create: createVendor,
    update: updateVendor,
    delete: deleteVendor,
  },
  onDeleteSuccess: (queryClient, orgId) => invalidateForTable(queryClient, orgId, 'vendors'),
})

export { vendorKeys }
export const useVendors = useList
export const useVendorMutations = useMutations
