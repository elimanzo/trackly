import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/motion/PageTransition'
import { OrgRealtimeSync } from '@/lib/hooks/useOrgRealtimeSync'
import { OrgProvider } from '@/providers/OrgProvider'

import { OrgAccessGuard } from './OrgAccessGuard'

export default async function OrgSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    <OrgProvider slug={slug}>
      <OrgRealtimeSync />
      <AppShell>
        <OrgAccessGuard>
          <PageTransition>{children}</PageTransition>
        </OrgAccessGuard>
      </AppShell>
    </OrgProvider>
  )
}
