'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { completeMaintenanceAction } from '@/app/actions/maintenance'
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
import { Textarea } from '@/components/ui/textarea'
import {
  CompleteMaintenanceFormSchema,
  type CompleteMaintenanceFormInput,
} from '@/lib/types/maintenance'
import { useOrg } from '@/providers/OrgProvider'

interface CompleteMaintenanceModalProps {
  eventId: string
  assetId: string
  assetDepartmentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CompleteMaintenanceModal({
  eventId,
  assetId,
  assetDepartmentId,
  open,
  onOpenChange,
  onSuccess,
}: CompleteMaintenanceModalProps) {
  const { membership } = useOrg()
  const orgSlug = membership?.orgSlug ?? ''

  const form = useForm<CompleteMaintenanceFormInput>({
    resolver: zodResolver(CompleteMaintenanceFormSchema),
    defaultValues: {
      completedAt: new Date().toISOString().slice(0, 10),
      cost: null,
      technicianName: null,
      notes: null,
    },
  })

  const isSubmitting = form.formState.isSubmitting

  async function onSubmit(data: CompleteMaintenanceFormInput) {
    const result = await completeMaintenanceAction(
      orgSlug,
      assetId,
      eventId,
      assetDepartmentId,
      data
    )
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Maintenance completed')
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete maintenance</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="completedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completion date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What was done, parts replaced, findings..."
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
                {isSubmitting ? 'Saving…' : 'Mark completed'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
