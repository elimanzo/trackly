'use client'

import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from 'next-themes'

import { Toaster } from '@/components/ui/sonner'

import { AuthProvider } from './AuthProvider'
import { OrgDataProvider } from './OrgDataProvider'
import { OrgProvider } from './OrgProvider'
import { QueryProvider } from './QueryProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryProvider>
          <AuthProvider>
            <OrgProvider>
              <OrgDataProvider>
                {children}
                <Toaster richColors position="top-right" />
              </OrgDataProvider>
            </OrgProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
