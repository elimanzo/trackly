'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { OrgMembership, Organization, UserRole } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

const LAST_ORG_KEY = 'asset-tracker:active-org-slug'

type OrgContextValue = {
  org: Organization | null
  membership: OrgMembership | null
  // Convenience accessors scoped to the active org
  role: UserRole | null
  departmentIds: string[]
  departmentNames: string[]
  refetchOrg: () => void
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { user, departments } = useAuth()
  const [org, setOrg] = useState<Organization | null>(null)

  // Derive the active membership from the user's memberships list
  const membership = user?.memberships.find((m) => m.orgSlug === slug) ?? null

  // Fetch org data by slug
  const refetchOrg = useCallback(() => {
    if (!slug) return
    const supabase = createClient()
    supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }: { data: Record<string, unknown> | null }) => {
        if (!data) return
        setOrg({
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
  }, [slug])

  useEffect(() => {
    refetchOrg()
  }, [refetchOrg])

  const activeDepartments = useMemo(
    () => (org ? departments.filter((d) => d.orgId === org.id) : []),
    [departments, org]
  )
  const departmentIds = useMemo(
    () => activeDepartments.map((d) => d.departmentId),
    [activeDepartments]
  )
  const departmentNames = useMemo(() => activeDepartments.map((d) => d.name), [activeDepartments])

  // Remember last active org in localStorage
  useEffect(() => {
    if (slug) {
      try {
        localStorage.setItem(LAST_ORG_KEY, slug)
      } catch {
        // localStorage unavailable (incognito, quota exceeded, or disabled)
      }
    }
  }, [slug])

  return (
    <OrgContext.Provider
      value={{
        org,
        membership,
        role: membership?.role ?? null,
        departmentIds,
        departmentNames,
        refetchOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  )
}

const DEFAULT_ORG_CONTEXT: OrgContextValue = {
  org: null,
  membership: null,
  role: null,
  departmentIds: [],
  departmentNames: [],
  refetchOrg: () => {},
}

export function useOrg(): OrgContextValue {
  return useContext(OrgContext) ?? DEFAULT_ORG_CONTEXT
}

export { LAST_ORG_KEY }
