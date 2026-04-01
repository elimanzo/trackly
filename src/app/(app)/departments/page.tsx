'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { countAssetsInDepartment } from '@/app/actions/departments'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useDepartmentMutations, useDepartments } from '@/lib/hooks/useDepartments'
import { DepartmentFormSchema, type Department, type DepartmentFormInput } from '@/lib/types'
import { useOrg } from '@/providers/OrgProvider'

export default function DepartmentsPage() {
  const { data: departments, isLoading } = useDepartments()
  const {
    create: createDepartment,
    update: updateDepartment,
    remove: deleteDepartment,
  } = useDepartmentMutations()
  const { org } = useOrg()
  const deptLabel = org?.departmentLabel ?? 'Department'

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; assetCount: number } | null>(null)

  const form = useForm<DepartmentFormInput>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: { name: '', description: '' },
  })

  if (isLoading) return <PageLoader />

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '' })
    setSheetOpen(true)
  }

  function openEdit(dept: Department) {
    setEditing(dept)
    form.reset({ name: dept.name, description: dept.description ?? '' })
    setSheetOpen(true)
  }

  async function openDelete(id: string) {
    const count = await countAssetsInDepartment(id)
    setDeleteTarget({ id, assetCount: count })
  }

  function onSubmit(data: DepartmentFormInput) {
    if (editing) {
      updateDepartment(editing.id, data)
    } else {
      createDepartment(data)
    }
    setSheetOpen(false)
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title={`${deptLabel}s`}
          description={`${departments.length} ${deptLabel.toLowerCase()}${departments.length !== 1 ? 's' : ''}`}
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add {deptLabel.toLowerCase()}
            </Button>
          }
        />

        {departments.length === 0 ? (
          <EmptyState
            icon={Plus}
            title={`No ${deptLabel.toLowerCase()}s yet`}
            description={`Add ${deptLabel.toLowerCase()}s to organise your assets.`}
            action={
              <Button size="sm" onClick={openCreate}>
                Add {deptLabel.toLowerCase()}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => (
              <Card key={dept.id} className="shadow-sm">
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-foreground font-semibold">{dept.name}</p>
                    {dept.description && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                        {dept.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(dept)}
                      aria-label={`Edit ${dept.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => void openDelete(dept.id)}
                      aria-label={`Delete ${dept.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader className="px-4">
            <SheetTitle>
              {editing ? `Edit ${deptLabel.toLowerCase()}` : `New ${deptLabel.toLowerCase()}`}
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. IT" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`What does this ${deptLabel.toLowerCase()} manage?`}
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-2">
                  <Button type="submit">{editing ? 'Save changes' : 'Create'}</Button>
                  <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={`Delete ${deptLabel.toLowerCase()}?`}
        description={
          deleteTarget?.assetCount
            ? `${deleteTarget.assetCount} asset${deleteTarget.assetCount !== 1 ? 's' : ''} will have their ${deptLabel.toLowerCase()} cleared. This cannot be undone.`
            : `This will permanently remove the ${deptLabel.toLowerCase()}.`
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteDepartment(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </>
  )
}
