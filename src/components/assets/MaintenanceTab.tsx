'use client'

import { CalendarClock, Loader2, Play, Plus, Wrench } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { startMaintenanceAction } from '@/app/actions/maintenance'
import { CompleteMaintenanceModal } from '@/components/assets/CompleteMaintenanceModal'
import { ScheduleMaintenanceModal } from '@/components/assets/ScheduleMaintenanceModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAssetMaintenanceEvents } from '@/lib/hooks/useMaintenance'
import { createPolicy } from '@/lib/permissions'
import type { UserRole } from '@/lib/types'
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceEvent,
} from '@/lib/types/maintenance'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { useOrg } from '@/providers/OrgProvider'

const STATUS_COLORS: Record<MaintenanceEvent['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

interface MaintenanceTabProps {
  assetId: string
  assetDepartmentId: string | null
  isBulk: boolean
  role: UserRole | null
  departmentIds: string[]
}

export function MaintenanceTab({
  assetId,
  assetDepartmentId,
  isBulk,
  role,
  departmentIds,
}: MaintenanceTabProps) {
  const router = useRouter()
  const { data: events, isLoading, refresh } = useAssetMaintenanceEvents(assetId)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const canManage = role
    ? createPolicy({ role, departmentIds }).can('maintenance:manage', {
        departmentId: assetDepartmentId,
      })
    : false

  function handleSuccess() {
    refresh()
    router.refresh()
  }

  if (isBulk) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border py-12 text-center text-sm">
        <Wrench className="h-8 w-8 opacity-30" />
        <p className="font-medium">Maintenance is not tracked for bulk assets.</p>
        <p className="max-w-xs">
          To track maintenance per unit, create each item as a serialized asset with its own asset
          tag.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {events.length === 0
            ? 'No maintenance history yet.'
            : `${events.length} event${events.length !== 1 ? 's' : ''}`}
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setScheduleOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Schedule maintenance
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border py-12 text-center text-sm">
          <Wrench className="h-8 w-8 opacity-30" />
          <p>No maintenance events recorded.</p>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
              Schedule the first one
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <MaintenanceEventCard
              key={event.id}
              event={event}
              assetDepartmentId={assetDepartmentId}
              canManage={canManage}
              onSuccess={handleSuccess}
            />
          ))}
        </div>
      )}

      {scheduleOpen && (
        <ScheduleMaintenanceModal
          assetId={assetId}
          assetDepartmentId={assetDepartmentId}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

interface MaintenanceEventCardProps {
  event: MaintenanceEvent
  assetDepartmentId: string | null
  canManage: boolean
  onSuccess: () => void
}

function MaintenanceEventCard({
  event,
  assetDepartmentId,
  canManage,
  onSuccess,
}: MaintenanceEventCardProps) {
  const { membership } = useOrg()
  const orgSlug = membership?.orgSlug ?? ''
  const [completeOpen, setCompleteOpen] = useState(false)
  const [starting, setStarting] = useState(false)

  async function handleStart() {
    setStarting(true)
    const result = await startMaintenanceAction(orgSlug, event.id, assetDepartmentId)
    setStarting(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Maintenance started')
    onSuccess()
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            {/* Title + badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">{event.title}</span>
              <Badge variant="outline" className="text-xs">
                {MAINTENANCE_TYPE_LABELS[event.type]}
              </Badge>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[event.status]}`}
              >
                {MAINTENANCE_STATUS_LABELS[event.status]}
              </span>
            </div>

            {/* Meta row */}
            <div className="text-muted-foreground grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                {formatDate(event.scheduledDate)}
              </span>
              {event.technicianName && <span>Technician: {event.technicianName}</span>}
              {event.completedAt && <span>Completed: {formatDate(event.completedAt)}</span>}
              {event.cost != null && <span>Cost: {formatCurrency(event.cost)}</span>}
              {event.notes && <span className="col-span-2 truncate">Notes: {event.notes}</span>}
            </div>
          </div>

          {/* Action buttons */}
          {canManage && event.status === 'scheduled' && (
            <Button size="sm" variant="outline" onClick={handleStart} disabled={starting}>
              {starting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Start</span>
            </Button>
          )}
          {canManage && event.status === 'in_progress' && (
            <>
              <Button size="sm" variant="outline" onClick={() => setCompleteOpen(true)}>
                <Wrench className="h-3.5 w-3.5" />
                <span className="ml-1.5">Complete</span>
              </Button>
              <CompleteMaintenanceModal
                eventId={event.id}
                assetDepartmentId={assetDepartmentId}
                open={completeOpen}
                onOpenChange={setCompleteOpen}
                onSuccess={onSuccess}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
