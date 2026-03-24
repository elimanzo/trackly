import { BoxesIcon } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="bg-primary flex h-9 w-9 items-center justify-center rounded-xl shadow-md">
          <BoxesIcon className="text-primary-foreground h-5 w-5" />
        </div>
        <span className="text-foreground text-xl font-bold">Asset Tracker</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
