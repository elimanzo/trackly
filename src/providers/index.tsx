'use client'

import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from 'next-themes'

import { Toaster } from '@/components/ui/sonner'
import { OrgRealtimeSync } from '@/lib/hooks/useOrgRealtimeSync'

import { AuthProvider } from './AuthProvider'
import { OrgProvider } from './OrgProvider'
import { QueryProvider } from './QueryProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryProvider>
          <AuthProvider>
            <OrgProvider>
              <OrgRealtimeSync />
              {children}
              <Toaster richColors position="top-right" />
            </OrgProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
