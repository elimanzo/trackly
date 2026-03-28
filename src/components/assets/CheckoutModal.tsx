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
import { useDepartments } from '@/lib/hooks/useDepartments'
import { useLocations } from '@/lib/hooks/useLocations'
import { CheckoutFormSchema, type CheckoutFormInput } from '@/lib/types'
import type { AssetWithRelations } from '@/lib/types'
import { computeAvailable } from '@/lib/utils/availability'
import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

interface CheckoutModalProps {
  asset: AssetWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CheckoutModal({ asset, open, onOpenChange, onSuccess }: CheckoutModalProps) {
  const { user } = useAuth()
  const { org } = useOrg()
  const deptLabel = org?.departmentLabel ?? 'Department'
  const { data: departments } = useDepartments()
  const { data: locations } = useLocations()

  const available = asset.isBulk
    ? computeAvailable(asset.quantity ?? 0, asset.quantityCheckedOut)
    : null

  const form = useForm<CheckoutFormInput>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      assignedToUserId: null,
      assignedToName: '',
      quantity: 1,
      departmentId: null,
      locationId: null,
      expectedReturnAt: null,
      notes: '',
    },
  })

  async function onSubmit(data: CheckoutFormInput) {
    if (!user) return
    const result = await checkoutAsset(asset.id, data, user.fullName, asset.isBulk)
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
          <DialogTitle>Check out {asset.isBulk ? 'items' : 'asset'}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">{asset.name}</span>
          {asset.isBulk && available !== null && (
            <span className="ml-2">— {available} available</span>
          )}
          {!asset.isBulk && <span> &mdash; {asset.assetTag}</span>}
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

            {asset.isBulk && (
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
                        max={available ?? undefined}
                        step={1}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    {available !== null && (
                      <FormDescription className="text-xs">{available} in stock</FormDescription>
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
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
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
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
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
              <Button type="submit" disabled={asset.isBulk && available === 0}>
                Check out
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
