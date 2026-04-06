'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { updateAssignment } from '@/app/actions/assets'
import { QuickAddDialog } from '@/components/shared/QuickAddDialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDepartmentMutations, useDepartments } from '@/lib/hooks/useDepartments'
import { useLocationMutations, useLocations } from '@/lib/hooks/useLocations'
import { CheckoutFormSchema, type AssetAssignment, type CheckoutFormInput } from '@/lib/types'
import { useOrg } from '@/providers/OrgProvider'

interface EditAssignmentModalProps {
  assignment: AssetAssignment
  assetId: string
  isBulk: boolean
  maxQuantity?: number // available + this assignment's current quantity
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditAssignmentModal({
  assignment,
  assetId,
  isBulk,
  maxQuantity,
  open,
  onOpenChange,
  onSuccess,
}: EditAssignmentModalProps) {
  const { org, membership } = useOrg()
  const orgSlug = membership?.orgSlug ?? ''
  const deptLabel = org?.departmentLabel ?? 'Department'
  const { data: departments } = useDepartments()
  const { create: createDepartment } = useDepartmentMutations()
  const { data: locations } = useLocations()
  const { create: createLocation } = useLocationMutations()
  const [quickAdd, setQuickAdd] = useState<'department' | 'location' | null>(null)

  const form = useForm<CheckoutFormInput>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      assignedToUserId: assignment.assignedToUserId,
      assignedToName: assignment.assignedToName,
      quantity: assignment.quantity,
      departmentId: assignment.departmentId,
      locationId: assignment.locationId,
      expectedReturnAt: assignment.expectedReturnAt
        ? assignment.expectedReturnAt.slice(0, 10)
        : null,
      notes: assignment.notes ?? '',
    },
  })

  // Re-sync if a different assignment is opened
  useEffect(() => {
    form.reset({
      assignedToUserId: assignment.assignedToUserId,
      assignedToName: assignment.assignedToName,
      quantity: assignment.quantity,
      departmentId: assignment.departmentId,
      locationId: assignment.locationId,
      expectedReturnAt: assignment.expectedReturnAt
        ? assignment.expectedReturnAt.slice(0, 10)
        : null,
      notes: assignment.notes ?? '',
    })
  }, [assignment.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: CheckoutFormInput) {
    const result = await updateAssignment(orgSlug, assignment.id, { id: assetId, isBulk }, data)
    if (result?.error) {
      form.setError('assignedToName', { message: result.error })
      return
    }
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit checkout</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="assignedToName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned to</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isBulk && (
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={maxQuantity}
                          step={1}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      {maxQuantity !== undefined && (
                        <FormDescription className="text-xs">
                          Max {maxQuantity} (available + currently on this assignment)
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{deptLabel} (optional)</FormLabel>
                      <Select
                        value={field.value ?? '__none__'}
                        onValueChange={(v) => {
                          if (v === '__new__') {
                            setQuickAdd('department')
                          } else {
                            field.onChange(v === '__none__' ? null : v)
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new__" className="text-primary font-medium">
                            <span className="flex items-center gap-1.5">
                              <Plus className="h-3.5 w-3.5" />
                              Add {deptLabel.toLowerCase()}
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (optional)</FormLabel>
                      <Select
                        value={field.value ?? '__none__'}
                        onValueChange={(v) => {
                          if (v === '__new__') {
                            setQuickAdd('location')
                          } else {
                            field.onChange(v === '__none__' ? null : v)
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {locations.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new__" className="text-primary font-medium">
                            <span className="flex items-center gap-1.5">
                              <Plus className="h-3.5 w-3.5" />
                              Add location
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="expectedReturnAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected return date (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
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
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <QuickAddDialog
        open={quickAdd === 'department'}
        onOpenChange={(open) => !open && setQuickAdd(null)}
        title={`Add ${deptLabel}`}
        onAdd={async (name) => {
          const id = await createDepartment({ name })
          if (id) form.setValue('departmentId', id)
          return id
        }}
      />
      <QuickAddDialog
        open={quickAdd === 'location'}
        onOpenChange={(open) => !open && setQuickAdd(null)}
        title="Add location"
        onAdd={async (name) => {
          const id = await createLocation({ name })
          if (id) form.setValue('locationId', id)
          return id
        }}
      />
    </>
  )
}
