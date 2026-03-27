'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { Organization } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

const ONBOARDING_KEY = 'trackly-onboarding-completed'

type OrgContextValue = {
  org: Organization | null
  onboardingCompleted: boolean
  setOrg: (org: Organization) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [org, setOrgState] = useState<Organization | null>(null)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(ONBOARDING_KEY)
    return stored === null ? true : stored === 'true'
  })

  useEffect(() => {
    if (!user?.orgId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrgState(null)
      return
    }
    const supabase = createClient()
    supabase
      .from('organizations')
      .select('*')
      .eq('id', user.orgId)
      .single()
      .then(({ data }: { data: Record<string, unknown> | null }) => {
        if (!data) return
        setOrgState({
          id: data.id as string,
          name: data.name as string,
          slug: data.slug as string,
          ownerId: data.owner_id as string,
          logoUrl: (data.logo_url as string | null) ?? null,
          onboardingCompleted: data.onboarding_completed as boolean,
          departmentLabel: (data.department_label as string | null) ?? 'Department',
          dashboardConfig: (data.dashboard_config as Record<string, unknown> | null) ?? {},
          assetTableConfig: (data.asset_table_config as Record<string, unknown> | null) ?? {},
          reportConfig: (data.report_config as Record<string, unknown> | null) ?? {},
          createdAt: data.created_at as string,
          updatedAt: data.updated_at as string,
        })
      })
  }, [user?.orgId])

  const setOrg = useCallback((o: Organization) => {
    setOrgState(o)
  }, [])

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setOnboardingCompleted(true)
  }, [])

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
