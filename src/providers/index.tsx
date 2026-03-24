'use client'

import { Toaster } from '@/components/ui/sonner'

import { AuthProvider } from './AuthProvider'
import { OrgProvider } from './OrgProvider'
import { QueryProvider } from './QueryProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <OrgProvider>
          {children}
          <Toaster richColors position="top-right" />
        </OrgProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
