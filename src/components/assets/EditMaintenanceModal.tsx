'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { updateMaintenanceAction } from '@/app/actions/maintenance'
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
import {
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPES,
  UpdateMaintenanceFormSchema,
  type MaintenanceEvent,
  type UpdateMaintenanceFormInput,
} from '@/lib/types/maintenance'
import { formatDate } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

interface EditMaintenanceModalProps {
  event: MaintenanceEvent
  assetDepartmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditMaintenanceModal({
  event,
  assetDepartmentId,
  open,
  onOpenChange,
  onSuccess,
}: EditMaintenanceModalProps) {
  const { membership } = useOrg()
  const orgSlug = membership?.orgSlug ?? ''

  const form = useForm<UpdateMaintenanceFormInput>({
    resolver: zodResolver(UpdateMaintenanceFormSchema),
    defaultValues: {
      title: event.title,
      type: event.type,
      scheduledDate: event.scheduledDate,
      cost: event.cost,
      technicianName: event.technicianName,
      notes: event.notes,
    },
  })

  // Keep form in sync if the event prop changes (e.g. after a refresh)
  useEffect(() => {
    form.reset({
      title: event.title,
      type: event.type,
      scheduledDate: event.scheduledDate,
      cost: event.cost,
      technicianName: event.technicianName,
      notes: event.notes,
    })
  }, [event, form])

  async function onSubmit(data: UpdateMaintenanceFormInput) {
    const result = await updateMaintenanceAction(orgSlug, event.id, assetDepartmentId, data)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Maintenance event updated')
    onOpenChange(false)
    onSuccess()
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit maintenance event</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Annual inspection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MAINTENANCE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {MAINTENANCE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scheduled date */}
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Locked timestamps (read-only display) */}
            {(event.startedAt || event.completedAt) && (
              <div className="bg-muted/50 space-y-1 rounded-md border px-3 py-2">
                <p className="text-muted-foreground text-xs font-medium">Locked timestamps</p>
                {event.startedAt && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Started:</span>{' '}
                    {formatDate(event.startedAt)}
                  </p>
                )}
                {event.completedAt && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Completed:</span>{' '}
                    {formatDate(event.completedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Cost */}
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? null : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Technician */}
            <FormField
              control={form.control}
              name="technicianName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technician (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Bob Smith"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What needs to be done, or what was done..."
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
