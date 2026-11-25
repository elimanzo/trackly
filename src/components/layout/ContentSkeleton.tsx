import { Skeleton } from '@/components/ui/skeleton'

/**
 * Pane-scoped loading placeholder shown inside the persistent app frame while
 * shell/startup context is still fetching. The sidebar and topbar render
 * immediately; only this content area shows a skeleton.
 */
export function ContentSkeleton() {
  return (
    <div className="space-y-6" data-testid="content-skeleton">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
