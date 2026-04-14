'use client'

import { CalendarClock, Wrench } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  type MaintenanceListFilters,
  type MaintenanceListItem,
  useMaintenanceList,
} from '@/lib/hooks/useMaintenance'
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPES,
  MAINTENANCE_TYPE_LABELS,
} from '@/lib/types/maintenance'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

const STATUS_COLORS: Record<MaintenanceListItem['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

const TYPE_COLORS: Record<MaintenanceListItem['type'], string> = {
  preventive: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  corrective: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  inspection: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

export default function MaintenancePage() {
  const { membership } = useOrg()
  const orgSlug = membership?.orgSlug ?? ''

  const [filters, setFilters] = useState<MaintenanceListFilters>({})
  const { data: events, isLoading } = useMaintenanceList(filters)

  function setFilter(key: keyof MaintenanceListFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value || undefined }))
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description={
          isLoading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''}`
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status || '__all__'}
          onValueChange={(v) => setFilter('status', v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            {MAINTENANCE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {MAINTENANCE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.type || '__all__'}
          onValueChange={(v) => setFilter('type', v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            {MAINTENANCE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {MAINTENANCE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <CalendarClock className="text-muted-foreground h-4 w-4" />
          <Input
            type="date"
            className="w-36 cursor-pointer"
            value={filters.dateFrom ?? ''}
            onChange={(e) => setFilter('dateFrom', e.target.value)}
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            className="w-36 cursor-pointer"
            value={filters.dateTo ?? ''}
            onChange={(e) => setFilter('dateTo', e.target.value)}
            placeholder="To"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="overflow-hidden rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 7 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="space-y-1.5">
                      <Skeleton
                        className={cn(
                          'h-3.5',
                          i % 3 === 0 ? 'w-32' : i % 3 === 1 ? 'w-24' : 'w-40'
                        )}
                      />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className={cn('h-3.5', i % 2 === 0 ? 'w-40' : 'w-32')} />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3.5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className={cn('h-3.5', i % 2 === 0 ? 'w-24' : 'w-20')} />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-3.5 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance events found"
          description={
            hasFilters ? 'Try adjusting your filters.' : 'No maintenance has been scheduled yet.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border shadow-sm">
          <Table>
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="hover:bg-transparent [&>th]:shadow-[0_1px_0_0_hsl(var(--border))]">
                <TableHead>Asset</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event, index) => (
                <TableRow
                  key={event.id}
                  className="animate-in fade-in-0 duration-300"
                  style={{
                    animationDelay: `${Math.min(index * 20, 300)}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <TableCell>
                    <Link
                      href={`/orgs/${orgSlug}/assets/${event.assetId}`}
                      className="hover:text-primary font-medium underline-offset-4 hover:underline"
                    >
                      {event.assetName}
                    </Link>
                    {event.departmentName && (
                      <p className="text-muted-foreground text-xs">{event.departmentName}</p>
                    )}
                  </TableCell>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[event.type]}`}
                    >
                      {MAINTENANCE_TYPE_LABELS[event.type]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[event.status]}`}
                    >
                      {MAINTENANCE_STATUS_LABELS[event.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(event.scheduledDate)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {event.technicianName ?? '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {event.cost != null ? formatCurrency(event.cost) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
