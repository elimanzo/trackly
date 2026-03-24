import { RoleSwitcher } from '@/components/dev/RoleSwitcher'
import { AppShell } from '@/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <RoleSwitcher />
    </AppShell>
  )
}
