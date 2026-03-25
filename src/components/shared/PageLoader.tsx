import { Loader2 } from 'lucide-react'

export function PageLoader() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  )
}
