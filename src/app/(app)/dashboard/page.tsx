import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-foreground text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-1">Coming in the next step.</p>
    </div>
  )
}
