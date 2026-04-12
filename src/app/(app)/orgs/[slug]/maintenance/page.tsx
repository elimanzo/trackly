'use client'

import { CalendarClock, Loader2, Wrench } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  MAINTENANCE_TYPE_LABELS,
} from '@/lib/types/maintenance'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

const STATUS_COLORS: Record<MaintenanceListItem['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

export default function MaintenancePage() {
  const { membership } = useOrg()
  const orgSlug = membership?.orgSlug ?? ''

  const [filters, setFilters] = useState<MaintenanceListFilters>({})
  const { data: events, isLoading } = useMaintenanceList(filters)

  function handleStatusChange(value: string) {
    setFilters((f) => ({
      ...f,
      status: value === '__all__' ? '' : (value as MaintenanceListFilters['status']),
    }))
  }

  function handleDateFromChange(value: string) {
    setFilters((f) => ({ ...f, dateFrom: value || undefined }))
  }

  function handleDateToChange(value: string) {
    setFilters((f) => ({ ...f, dateTo: value || undefined }))
  }

  const hasFilters = !!filters.status || !!filters.dateFrom || !!filters.dateTo

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
        <Select value={filters.status || '__all__'} onValueChange={handleStatusChange}>
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

        <div className="flex items-center gap-1.5">
          <CalendarClock className="text-muted-foreground h-4 w-4" />
          <Input
            type="date"
            className="w-36"
            value={filters.dateFrom ?? ''}
            onChange={(e) => handleDateFromChange(e.target.value)}
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            className="w-36"
            value={filters.dateTo ?? ''}
            onChange={(e) => handleDateToChange(e.target.value)}
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
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
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
        <div className="rounded-md border">
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
              {events.map((event) => (
                <TableRow key={event.id}>
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
                    <Badge variant="outline" className="text-xs">
                      {MAINTENANCE_TYPE_LABELS[event.type]}
                    </Badge>
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
                  <TableCell className="text-right text-sm">
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
