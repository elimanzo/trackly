'use client'

import { createContext, useCallback, useContext, useState } from 'react'

import { MOCK_ORG } from '@/lib/mock-data'
import type { Organization } from '@/lib/types'

const ONBOARDING_KEY = 'asset-tracker-onboarding-completed'

type OrgContextValue = {
  org: Organization | null
  onboardingCompleted: boolean
  setOrg: (org: Organization) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ children }: { children: React.ReactNode }) {
  // Phase 1: always use the mock org; track onboarding state per-session
  const [org] = useState<Organization | null>(MOCK_ORG)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(ONBOARDING_KEY)
    // Default to true so existing "logged in" users go straight to dashboard
    return stored === null ? true : stored === 'true'
  })

  const setOrg = useCallback((_org: Organization) => {
    // Phase 2: will persist to Supabase
  }, [])

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setOnboardingCompleted(true)
  }, [])

  /** Dev helper: reset onboarding so the flow can be demoed again */
  const resetOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'false')
    setOnboardingCompleted(false)
  }, [])

  return (
    <OrgContext.Provider
      value={{ org, onboardingCompleted, setOrg, completeOnboarding, resetOnboarding }}
    >
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within <OrgProvider>')
  return ctx
}
