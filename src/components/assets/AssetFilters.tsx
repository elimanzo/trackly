'use client'

import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ASSET_STATUS_CONFIG } from '@/lib/constants'
import type { AssetFilters } from '@/lib/hooks/useAssets'
import { useDepartments } from '@/lib/hooks/useDepartments'
import { ASSET_STATUSES } from '@/lib/types'
import { useOrg } from '@/providers/OrgProvider'

interface AssetFiltersBarProps {
  filters: AssetFilters
  onFiltersChange: (filters: AssetFilters) => void
  showDepartmentFilter?: boolean
}

export function AssetFiltersBar({
  filters,
  onFiltersChange,
  showDepartmentFilter = true,
}: AssetFiltersBarProps) {
  const { data: departments } = useDepartments()
  const { org } = useOrg()
  const deptLabel = org?.departmentLabel ?? 'Department'
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep local input in sync if parent clears filters
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(filters.search ?? '')
  }, [filters.search])

  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value })
    }, 300)
  }

  const hasActiveFilters = !!(filters.search || filters.status || filters.departmentId)

  function clearFilters() {
    onFiltersChange({ search: '', status: '', departmentId: '' })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name, tag, category…"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status ?? ''}
        onValueChange={(val) =>
          onFiltersChange({
            ...filters,
            status: val === 'all' ? '' : (val as AssetFilters['status']),
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {ASSET_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {ASSET_STATUS_CONFIG[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showDepartmentFilter && (
        <Select
          value={filters.departmentId ?? ''}
          onValueChange={(val) =>
            onFiltersChange({ ...filters, departmentId: val === 'all' ? '' : val })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={`All ${deptLabel.toLowerCase()}s`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {deptLabel.toLowerCase()}s</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
