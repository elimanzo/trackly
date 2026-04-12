'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { scheduleMaintenanceAction } from '@/app/actions/maintenance'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  MaintenanceFormSchema,
  type MaintenanceFormInput,
} from '@/lib/types/maintenance'
import { useOrg } from '@/providers/OrgProvider'

interface ScheduleMaintenanceModalProps {
  assetId: string
  assetDepartmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ScheduleMaintenanceModal({
  assetId,
  assetDepartmentId,
  open,
  onOpenChange,
  onSuccess,
}: ScheduleMaintenanceModalProps) {
  const { membership } = useOrg()
  const orgSlug = membership?.orgSlug ?? ''

  const form = useForm<MaintenanceFormInput>({
    resolver: zodResolver(MaintenanceFormSchema),
    defaultValues: {
      isRetroactive: false,
      title: '',
      type: 'preventive',
      scheduledDate: '',
      startedAt: null,
      completedAt: null,
      cost: null,
      technicianName: null,
      notes: null,
    },
  })

  const isRetroactive = form.watch('isRetroactive')
  const isSubmitting = form.formState.isSubmitting

  async function onSubmit(data: MaintenanceFormInput) {
    const result = await scheduleMaintenanceAction(orgSlug, assetId, assetDepartmentId, data)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(data.isRetroactive ? 'Maintenance logged' : 'Maintenance scheduled')
    form.reset()
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {isRetroactive ? 'Log past maintenance' : 'Schedule maintenance'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Retroactive toggle */}
            <FormField
              control={form.control}
              name="isRetroactive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    Log past maintenance (already completed)
                  </FormLabel>
                </FormItem>
              )}
            />

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
                  <FormLabel>{isRetroactive ? 'Planned date' : 'Scheduled date'}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Retroactive-only fields */}
            {isRetroactive && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
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
                    name="completedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Completion date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
              </>
            )}

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
                {isSubmitting ? 'Saving…' : isRetroactive ? 'Log maintenance' : 'Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
