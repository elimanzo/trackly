import { BoxesIcon } from 'lucide-react'

import { FadeIn } from '@/components/motion/FadeIn'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <FadeIn className="mb-8 flex items-center gap-2">
        <div className="bg-primary flex h-9 w-9 items-center justify-center rounded-xl shadow-md">
          <BoxesIcon className="text-primary-foreground h-5 w-5" />
        </div>
        <span className="text-foreground text-xl font-bold">Trackly</span>
      </FadeIn>
      <FadeIn delay={0.06} className="w-full max-w-sm">
        {children}
      </FadeIn>
    </div>
  )
}
