'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { countAssetsInCategory } from '@/app/actions/categories'
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
import { CategoryFormSchema, type Category, type CategoryFormInput } from '@/lib/types'
import { useOrgData } from '@/providers/OrgDataProvider'

export default function CategoriesPage() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useOrgData()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; assetCount: number } | null>(null)

  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: { name: '', description: '', icon: '' },
  })

  if (isLoading) return <PageLoader />

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '', icon: '' })
    setSheetOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    form.reset({ name: cat.name, description: cat.description ?? '', icon: cat.icon ?? '' })
    setSheetOpen(true)
  }

  async function openDelete(id: string) {
    const count = await countAssetsInCategory(id)
    setDeleteTarget({ id, assetCount: count })
  }

  function onSubmit(data: CategoryFormInput) {
    if (editing) {
      updateCategory(editing.id, data)
    } else {
      createCategory(data)
    }
    setSheetOpen(false)
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Categories"
          description={`${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`}
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          }
        />

        {categories.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No categories yet"
            description="Group your assets by category."
            action={
              <Button size="sm" onClick={openCreate}>
                Add category
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Card key={cat.id} className="shadow-sm">
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-foreground font-semibold">{cat.name}</p>
                    {cat.description && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(cat)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => void openDelete(cat.id)}
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
            <SheetTitle>{editing ? 'Edit category' : 'New category'}</SheetTitle>
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
                        <Input placeholder="e.g. Laptop" {...field} />
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
                        <Textarea placeholder="Describe this category…" rows={3} {...field} />
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
        title="Delete category?"
        description={
          deleteTarget?.assetCount
            ? `${deleteTarget.assetCount} asset${deleteTarget.assetCount !== 1 ? 's' : ''} will have their category cleared. This cannot be undone.`
            : 'This will permanently remove the category.'
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteCategory(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </>
  )
}
