'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

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
import { LocationFormSchema, type Location, type LocationFormInput } from '@/lib/types'
import { useOrgData } from '@/providers/OrgDataProvider'

export default function LocationsPage() {
  const { locations, isLoading, createLocation, updateLocation, deleteLocation } = useOrgData()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const form = useForm<LocationFormInput>({
    resolver: zodResolver(LocationFormSchema),
    defaultValues: { name: '', description: '' },
  })

  if (isLoading) return <PageLoader />

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', description: '' })
    setSheetOpen(true)
  }

  function openEdit(loc: Location) {
    setEditing(loc)
    form.reset({ name: loc.name, description: loc.description ?? '' })
    setSheetOpen(true)
  }

  function onSubmit(data: LocationFormInput) {
    if (editing) {
      updateLocation(editing.id, data)
    } else {
      createLocation(data)
    }
    setSheetOpen(false)
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Locations"
          description={`${locations.length} location${locations.length !== 1 ? 's' : ''}`}
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add location
            </Button>
          }
        />

        {locations.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No locations yet"
            description="Track where your assets are stored or used."
            action={
              <Button size="sm" onClick={openCreate}>
                Add location
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc) => (
              <Card key={loc.id} className="shadow-sm">
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-foreground font-semibold">{loc.name}</p>
                    {loc.description && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                        {loc.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(loc)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => setDeleteId(loc.id)}
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
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit location' : 'New location'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. HQ — Floor 2" {...field} />
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
                        <Textarea placeholder="Describe this location…" rows={3} {...field} />
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
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete location?"
        description="This will permanently remove the location."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) deleteLocation(deleteId)
          setDeleteId(null)
        }}
      />
    </>
  )
}
