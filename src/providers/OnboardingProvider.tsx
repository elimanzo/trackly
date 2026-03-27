'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type OnboardingState = {
  name: string
  slug: string
  departments: string[]
  categories: string[]
}

type OnboardingContextValue = OnboardingState & {
  setOrgInfo: (name: string, slug: string) => void
  setDepartments: (departments: string[]) => void
  setCategories: (categories: string[]) => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    name: '',
    slug: '',
    departments: [],
    categories: [],
  })

  const setOrgInfo = useCallback((name: string, slug: string) => {
    setState((prev) => ({ ...prev, name, slug }))
  }, [])

  const setDepartments = useCallback((departments: string[]) => {
    setState((prev) => ({ ...prev, departments }))
  }, [])

  const setCategories = useCallback((categories: string[]) => {
    setState((prev) => ({ ...prev, categories }))
  }, [])

  return (
    <OnboardingContext.Provider value={{ ...state, setOrgInfo, setDepartments, setCategories }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within <OnboardingProvider>')
  return ctx
}
