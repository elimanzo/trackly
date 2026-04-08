'use client'

import { ArrowLeft, BoxesIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden">
      <header className="border-border bg-card flex h-14 shrink-0 items-center gap-4 border-b px-6">
        <div className="flex items-center gap-2">
          <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg shadow-sm">
            <BoxesIcon className="text-primary-foreground h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Trackly</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-10">{children}</div>
      </div>
    </div>
  )
}
