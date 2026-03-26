'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { createAsset, getNextTagForPrefix, getTagPrefixes, updateAsset } from '@/app/actions/assets'
import { createCategory } from '@/app/actions/categories'
import { createDepartment } from '@/app/actions/departments'
import { createLocation } from '@/app/actions/locations'
import { createVendor } from '@/app/actions/vendors'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ASSET_STATUS_CONFIG } from '@/lib/constants'
import { useCategories } from '@/lib/hooks/useCategories'
import { useDepartments } from '@/lib/hooks/useDepartments'
import { useLocations } from '@/lib/hooks/useLocations'
import { useVendors } from '@/lib/hooks/useVendors'
import { ASSET_STATUSES, AssetFormSchema, type AssetFormInput } from '@/lib/types'
import type { AssetWithRelations } from '@/lib/types'
import { useOrg } from '@/providers/OrgProvider'

// ---------------------------------------------------------------------------
// QuickAddDialog — generic single-name creation dialog
// ---------------------------------------------------------------------------

interface QuickAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onAdd: (name: string) => Promise<string | null> // returns new id or null on error
}

function QuickAddDialog({ open, onOpenChange, title, onAdd }: QuickAddDialogProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const id = await onAdd(name.trim())
    setSaving(false)
    if (id) {
      setName('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleSave()
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || saving} onClick={() => void handleSave()}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// AssetForm
// ---------------------------------------------------------------------------

interface AssetFormProps {
  asset?: AssetWithRelations
  defaultAssetTag?: string
}

export function AssetForm({ asset, defaultAssetTag }: AssetFormProps) {
  const router = useRouter()
  const { data: departments } = useDepartments()
  const { org } = useOrg()
  const deptLabel = org?.departmentLabel ?? 'Department'
  const { data: categories } = useCategories()
  const { data: locations } = useLocations()
  const { data: vendors } = useVendors()

  const isEdit = !!asset

  // ---------------------------------------------------------------------------
  // Prefix-based tag state (new assets only)
  // ---------------------------------------------------------------------------

  // Split default tag into prefix + suffix (e.g. "AST-00001" → "AST", "00001")
  const initialPrefix = (() => {
    const tag = defaultAssetTag ?? 'AST-0001'
    const idx = tag.lastIndexOf('-')
    return idx > 0 ? tag.slice(0, idx) : 'AST'
  })()

  const initialSuffix = (() => {
    const tag = defaultAssetTag ?? ''
    const idx = tag.lastIndexOf('-')
    return idx > 0 ? tag.slice(idx + 1) : '0001'
  })()

  const [prefix, setPrefix] = useState(initialPrefix)
  const [tagSuffix, setTagSuffix] = useState(initialSuffix)
  const [prefixSuggestions, setPrefixSuggestions] = useState<string[]>([])
  const prefixInputId = 'prefix-suggestions'
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch prefix suggestions once on mount
  useEffect(() => {
    getTagPrefixes()
      .then(setPrefixSuggestions)
      .catch(() => {})
  }, [])

  // Fetch next suffix when prefix changes (debounced)
  useEffect(() => {
    if (isEdit) return
    const trimmed = prefix.trim()
    if (!trimmed) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      getNextTagForPrefix(trimmed)
        .then((tag) => {
          const idx = tag.lastIndexOf('-')
          if (idx > 0) setTagSuffix(tag.slice(idx + 1))
        })
        .catch(() => {})
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [prefix, isEdit])

  const fullTag = isEdit
    ? (asset?.assetTag ?? '')
    : `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '') || prefix}-${tagSuffix}`

  // ---------------------------------------------------------------------------
  // Quick-add dialog state
  // ---------------------------------------------------------------------------

  const [quickAdd, setQuickAdd] = useState<
    'category' | 'department' | 'location' | 'vendor' | null
  >(null)

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  const form = useForm<AssetFormInput>({
    resolver: zodResolver(AssetFormSchema),
    defaultValues: {
      name: asset?.name ?? '',
      assetTag: asset?.assetTag ?? defaultAssetTag ?? '',
      isBulk: asset?.isBulk ?? false,
      quantity: asset?.quantity ?? null,
      categoryId: asset?.categoryId ?? null,
      departmentId: asset?.departmentId ?? null,
      locationId: asset?.locationId ?? null,
      status: asset?.status ?? 'active',
      purchaseDate: asset?.purchaseDate ?? null,
      purchaseCost: asset?.purchaseCost ?? null,
      warrantyExpiry: asset?.warrantyExpiry ?? null,
      vendorId: asset?.vendorId ?? null,
      notes: asset?.notes ?? '',
    },
  })

  // Keep assetTag in sync with prefix/suffix changes (new only)
  useEffect(() => {
    if (!isEdit) {
      form.setValue('assetTag', fullTag, { shouldValidate: false })
    }
  }, [fullTag, isEdit, form])

  const isBulk = form.watch('isBulk')

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

          {/* Asset tag */}
          <FormField
            control={form.control}
            name="assetTag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset tag</FormLabel>
                {isEdit ? (
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                ) : (
                  <div className="flex items-center gap-1">
                    {/* Prefix input */}
                    <FormControl>
                      <Input
                        list={prefixInputId}
                        placeholder="PREFIX"
                        className="uppercase"
                        value={prefix}
                        onChange={(e) =>
                          setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                        }
                        onBlur={() => {
                          // Ensure form value is synced on blur
                          form.setValue('assetTag', fullTag)
                        }}
                      />
                    </FormControl>
                    <datalist id={prefixInputId}>
                      {prefixSuggestions.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                    <span className="text-muted-foreground shrink-0 text-sm">-</span>
                    {/* Read-only suffix */}
                    <Input
                      readOnly
                      value={tagSuffix}
                      className="text-muted-foreground w-16 cursor-default bg-transparent text-center"
                      tabIndex={-1}
                    />
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {!isBulk && (
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
          )}
          <FormField
            control={form.control}
            name="isBulk"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                <div>
                  <FormLabel className="font-medium">Bulk / consumable item</FormLabel>
                  <p className="text-muted-foreground text-xs">
                    Track by quantity (USBs, cables, etc.) instead of individual asset tags.
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          {isBulk && (
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total quantity in stock</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="0"
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
          )}
        </div>

        {/* Classification */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Department */}
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{deptLabel}</FormLabel>
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
                      <SelectValue placeholder={`Select ${deptLabel.toLowerCase()}`} />
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

          {/* Category */}
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => {
                    if (v === '__new__') {
                      setQuickAdd('category')
                    } else {
                      field.onChange(v === '__none__' ? null : v)
                    }
                  }}
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
                    <SelectItem value="__new__" className="text-primary font-medium">
                      <span className="flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Add category
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Location */}
          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
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
                onValueChange={(v) => {
                  if (v === '__new__') {
                    setQuickAdd('vendor')
                  } else {
                    field.onChange(v === '__none__' ? null : v)
                  }
                }}
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
                  <SelectItem value="__new__" className="text-primary font-medium">
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add vendor
                    </span>
                  </SelectItem>
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

      {/* Quick-add dialogs */}
      {/* The server action inserts the record; OrgDataProvider's realtime subscription
          will pick it up and refresh the list automatically. We just set the form value
          immediately using the returned ID. */}
      <QuickAddDialog
        open={quickAdd === 'department'}
        onOpenChange={(open) => !open && setQuickAdd(null)}
        title={`Add ${deptLabel}`}
        onAdd={async (name) => {
          const result = await createDepartment({ name })
          if ('error' in result) {
            toast.error(result.error)
            return null
          }
          form.setValue('departmentId', result.id)
          return result.id
        }}
      />
      <QuickAddDialog
        open={quickAdd === 'category'}
        onOpenChange={(open) => !open && setQuickAdd(null)}
        title="Add category"
        onAdd={async (name) => {
          const result = await createCategory({ name })
          if ('error' in result) {
            toast.error(result.error)
            return null
          }
          form.setValue('categoryId', result.id)
          return result.id
        }}
      />
      <QuickAddDialog
        open={quickAdd === 'location'}
        onOpenChange={(open) => !open && setQuickAdd(null)}
        title="Add location"
        onAdd={async (name) => {
          const result = await createLocation({ name })
          if ('error' in result) {
            toast.error(result.error)
            return null
          }
          form.setValue('locationId', result.id)
          return result.id
        }}
      />
      <QuickAddDialog
        open={quickAdd === 'vendor'}
        onOpenChange={(open) => !open && setQuickAdd(null)}
        title="Add vendor"
        onAdd={async (name) => {
          const result = await createVendor({ name })
          if ('error' in result) {
            toast.error(result.error)
            return null
          }
          form.setValue('vendorId', result.id)
          return result.id
        }}
      />
    </Form>
  )
}
