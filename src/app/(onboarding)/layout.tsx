import { OnboardingShell } from '@/components/layout/OnboardingShell'
import { OnboardingProvider } from '@/providers/OnboardingProvider'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <OnboardingShell>{children}</OnboardingShell>
    </OnboardingProvider>
  )
}
