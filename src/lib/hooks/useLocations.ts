import { createLocation, deleteLocation, updateLocation } from '@/app/actions/locations'
import type { Location, LocationFormInput } from '@/lib/types'

import { makeEntityHooks } from './makeEntityHooks'

const {
  keys: locationKeys,
  useList,
  useMutations,
} = makeEntityHooks<Location, LocationFormInput>({
  queryKey: 'locations',
  table: 'locations',
  label: 'Location',
  mapRow: (r) => ({
    id: r.id as string,
    orgId: r.org_id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    deletedAt: (r.deleted_at as string | null) ?? null,
    createdAt: r.created_at as string,
  }),
  actions: {
    create: createLocation,
    update: updateLocation,
    delete: deleteLocation,
  },
})

export { locationKeys }
export const useLocations = useList
export const useLocationMutations = useMutations
