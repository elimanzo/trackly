'use client'

import { LayoutGrid, List, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { AssetCard } from '@/components/assets/AssetCard'
import { AssetFiltersBar } from '@/components/assets/AssetFilters'
import { AssetTable } from '@/components/assets/AssetTable'
import { StaggerChildren, StaggerItem } from '@/components/motion/StaggerChildren'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PaginationBar } from '@/components/shared/PaginationBar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { type AssetFilters, useAssets } from '@/lib/hooks/useAssets'
import { createPolicy } from '@/lib/permissions'
import { useOrg } from '@/providers/OrgProvider'

const PAGE_SIZE = 25

export default function AssetsPage() {
  const [view, setView] = useState<'table' | 'card'>('table')
  const [filters, setFilters] = useState<AssetFilters>({})
  const [page, setPage] = useState(1)
  const { data: assets, totalCount, isLoading } = useAssets(filters, page, PAGE_SIZE)
  const { role, departmentIds, membership } = useOrg()
  const orgSlug = membership?.orgSlug ?? ''
  const canCreate = role ? createPolicy({ role, departmentIds }).can('asset:create') : false

  function handleFiltersChange(next: AssetFilters) {
    setFilters(next)
    setPage(1) // reset to first page on filter change
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description={isLoading ? 'Loading…' : `${totalCount} asset${totalCount !== 1 ? 's' : ''}`}
        action={
          canCreate ? (
            <Button asChild>
              <Link href={`/orgs/${orgSlug}/assets/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add asset
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2">
        <AssetFiltersBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          showDepartmentFilter={canCreate}
        />
        <div className="ml-auto flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={view === 'table' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView('table')}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'card' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView('card')}
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-md border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={List}
          title="No assets found"
          description="Try adjusting your filters or add a new asset."
          action={
            canCreate ? (
              <Button asChild size="sm">
                <Link href={`/orgs/${orgSlug}/assets/new`}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add asset
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : view === 'table' ? (
        <AssetTable assets={assets} />
      ) : (
        <StaggerChildren className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <StaggerItem key={asset.id}>
              <AssetCard asset={asset} />
            </StaggerItem>
          ))}
        </StaggerChildren>
      )}

      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
      />
    </div>
  )
}
