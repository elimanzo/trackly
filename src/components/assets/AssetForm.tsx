'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

import { createAsset, updateAsset } from '@/app/actions/assets'
import { Button } from '@/components/ui/button'
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
import { ASSET_STATUS_CONFIG } from '@/lib/constants'
import { useCategories } from '@/lib/hooks/useCategories'
import { useDepartments } from '@/lib/hooks/useDepartments'
import { useLocations } from '@/lib/hooks/useLocations'
import { useVendors } from '@/lib/hooks/useVendors'
import { ASSET_STATUSES, AssetFormSchema, type AssetFormInput } from '@/lib/types'
import type { AssetWithRelations } from '@/lib/types'

interface AssetFormProps {
  asset?: AssetWithRelations
  defaultAssetTag?: string
}

export function AssetForm({ asset, defaultAssetTag }: AssetFormProps) {
  const router = useRouter()
  const { data: departments } = useDepartments()
  const { data: categories } = useCategories()
  const { data: locations } = useLocations()
  const { data: vendors } = useVendors()

  const isEdit = !!asset

  const form = useForm<AssetFormInput>({
    resolver: zodResolver(AssetFormSchema),
    defaultValues: {
      name: asset?.name ?? '',
      assetTag: asset?.assetTag ?? defaultAssetTag ?? '',
      categoryId: asset?.categoryId ?? null,
      departmentId: asset?.departmentId ?? null,
      locationId: asset?.locationId ?? null,
      status: asset?.status ?? 'active',
      purchaseDate: asset?.purchaseDate ?? null,
      purchaseCost: asset?.purchaseCost ?? null,
      warrantyExpiry: asset?.warrantyExpiry ?? null,
      vendorId: asset?.vendorId ?? null,
      notes: asset?.notes ?? '',
      imageUrl: asset?.imageUrl ?? null,
    },
  })

  async function onSubmit(data: AssetFormInput) {
    if (isEdit && asset) {
      const result = await updateAsset(asset.id, data)
      if (result?.error) {
        form.setError('assetTag', { message: result.error })
        return
      }
      router.push(`/assets/${asset.id}`)
    } else {
      const result = await createAsset(data)
      if ('error' in result) {
        form.setError('assetTag', { message: result.error })
        return
      }
      router.push(`/assets/${result.id}`)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Core info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Asset name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Dell XPS 15 Laptop" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assetTag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset tag</FormLabel>
                <FormControl>
                  <Input placeholder="AST-00001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ASSET_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ASSET_STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Classification */}
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
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
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
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
                <FormLabel>Location</FormLabel>
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
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

        {/* Purchase info */}
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase date</FormLabel>
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
            name="purchaseCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase cost ($)</FormLabel>
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
            name="warrantyExpiry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Warranty expiry</FormLabel>
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
        </div>

        {/* Vendor */}
        <FormField
          control={form.control}
          name="vendorId"
          render={({ field }) => (
            <FormItem className="max-w-sm">
              <FormLabel>Vendor</FormLabel>
              <Select
                value={field.value ?? '__none__'}
                onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Serial number, accessories, condition notes…"
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit">{isEdit ? 'Save changes' : 'Create asset'}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
