import { createCategory, deleteCategory, updateCategory } from '@/app/actions/categories'
import type { Category, CategoryFormInput } from '@/lib/types'

import { makeEntityHooks } from './makeEntityHooks'
import { invalidateForTable } from './queryInvalidation'

const {
  keys: categoryKeys,
  useList,
  useMutations,
} = makeEntityHooks<Category, CategoryFormInput>({
  queryKey: 'categories',
  table: 'categories',
  label: 'Category',
  mapRow: (r) => ({
    id: r.id as string,
    orgId: r.org_id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    icon: (r.icon as string | null) ?? null,
    deletedAt: (r.deleted_at as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }),
  actions: {
    create: createCategory,
    update: updateCategory,
    delete: deleteCategory,
  },
  onDeleteSuccess: (queryClient, orgId) => invalidateForTable(queryClient, orgId, 'categories'),
})

export { categoryKeys }
export const useCategories = useList
export const useCategoryMutations = useMutations
