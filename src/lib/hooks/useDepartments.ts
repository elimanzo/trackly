import { createDepartment, deleteDepartment, updateDepartment } from '@/app/actions/departments'
import type { Department, DepartmentFormInput } from '@/lib/types'

import { makeEntityHooks } from './makeEntityHooks'
import { invalidateForTable } from './queryInvalidation'

const {
  keys: departmentKeys,
  useList,
  useMutations,
} = makeEntityHooks<Department, DepartmentFormInput>({
  queryKey: 'departments',
  table: 'departments',
  label: 'Department',
  mapRow: (r) => ({
    id: r.id as string,
    orgId: r.org_id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    deletedAt: (r.deleted_at as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }),
  actions: {
    create: createDepartment,
    update: updateDepartment,
    delete: deleteDepartment,
  },
  onDeleteSuccess: (queryClient, orgId) => invalidateForTable(queryClient, orgId, 'departments'),
})

export { departmentKeys }
export const useDepartments = useList
export const useDepartmentMutations = useMutations
