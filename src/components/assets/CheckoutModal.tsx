'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { checkoutAsset } from '@/app/actions/assets'
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
import { CheckoutFormSchema, type CheckoutFormInput } from '@/lib/types'
import type { AssetWithRelations } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

interface CheckoutModalProps {
  asset: AssetWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CheckoutModal({ asset, open, onOpenChange, onSuccess }: CheckoutModalProps) {
  const { user } = useAuth()

  const form = useForm<CheckoutFormInput>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      assignedToUserId: null,
      assignedToName: '',
      expectedReturnAt: null,
      notes: '',
    },
  })

  async function onSubmit(data: CheckoutFormInput) {
    if (!user) return
    const result = await checkoutAsset(asset.id, data, user.fullName)
    if (result?.error) {
      form.setError('assignedToName', { message: result.error })
      return
    }
    form.reset()
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check out asset</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">{asset.name}</span> &mdash; {asset.assetTag}
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assignedToName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <Textarea
                      placeholder="Reason, accessories included, etc."
                      rows={2}
                      {...field}
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
              <Button type="submit">Check out</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
