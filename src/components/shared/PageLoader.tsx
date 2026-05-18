import { Loader2 } from 'lucide-react'

/** Full-page centered spinner. Use while async page data is loading. */
export function PageLoader() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  )
}
