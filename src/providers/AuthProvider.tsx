'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { MOCK_USERS } from '@/lib/mock-data'
import type { ProfileWithDepartments } from '@/lib/types'

const SESSION_KEY = 'asset-tracker-mock-session'

type AuthContextValue = {
  user: ProfileWithDepartments | null
  isLoading: boolean
  signIn: (email: string) => void
  signOut: () => void
  /** Dev helper: switch to any mock user by ID */
  switchUser: (userId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ProfileWithDepartments | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) {
        const { userId } = JSON.parse(stored) as { userId: string }
        const found = MOCK_USERS.find((u) => u.id === userId) ?? null
        setUser(found)
      }
    } catch {
      // Corrupt storage — clear it
      localStorage.removeItem(SESSION_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signIn = useCallback((email: string) => {
    // Find by email or default to first mock user (owner)
    const found =
      MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? MOCK_USERS[0]
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: found.id }))
    setUser(found)
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const switchUser = useCallback((userId: string) => {
    const found = MOCK_USERS.find((u) => u.id === userId)
    if (!found) return
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: found.id }))
    setUser(found)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, switchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
