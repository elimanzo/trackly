'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { VendorFormSchema, type Vendor, type VendorFormInput } from '@/lib/types'
import { useOrgData } from '@/providers/OrgDataProvider'

export default function VendorsPage() {
  const { vendors, isLoading, createVendor, updateVendor, deleteVendor } = useOrgData()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const form = useForm<VendorFormInput>({
    resolver: zodResolver(VendorFormSchema),
    defaultValues: { name: '', contactEmail: '', contactPhone: '', website: '', notes: '' },
  })

  if (isLoading) return <PageLoader />

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', contactEmail: '', contactPhone: '', website: '', notes: '' })
    setSheetOpen(true)
  }

  function openEdit(vendor: Vendor) {
    setEditing(vendor)
    form.reset({
      name: vendor.name,
      contactEmail: vendor.contactEmail ?? '',
      contactPhone: vendor.contactPhone ?? '',
      website: vendor.website ?? '',
      notes: vendor.notes ?? '',
    })
    setSheetOpen(true)
  }

  function onSubmit(data: VendorFormInput) {
    if (editing) {
      updateVendor(editing.id, data)
    } else {
      createVendor(data)
    }
    setSheetOpen(false)
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Vendors"
          description={`${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}`}
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add vendor
            </Button>
          }
        />

        {vendors.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No vendors yet"
            description="Track the suppliers of your assets."
            action={
              <Button size="sm" onClick={openCreate}>
                Add vendor
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <Card key={vendor.id} className="shadow-sm">
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-foreground font-semibold">{vendor.name}</p>
                    {vendor.contactEmail && (
                      <p className="text-muted-foreground text-xs">{vendor.contactEmail}</p>
                    )}
                    {vendor.contactPhone && (
                      <p className="text-muted-foreground text-xs">{vendor.contactPhone}</p>
                    )}
                    {vendor.website && (
                      <a
                        href={vendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                      >
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(vendor)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => setDeleteId(vendor.id)}
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
            <SheetTitle>{editing ? 'Edit vendor' : 'New vendor'}</SheetTitle>
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
                        <Input placeholder="e.g. Dell Technologies" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact email (optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="sales@vendor.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 800 000 0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://vendor.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Preferred supplier for…" rows={2} {...field} />
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
        title="Delete vendor?"
        description="This will permanently remove the vendor."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) deleteVendor(deleteId)
          setDeleteId(null)
        }}
      />
    </>
  )
}
