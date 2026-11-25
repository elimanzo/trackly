'use client'

import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState } from 'react'

import { useStartupContext } from '@/lib/hooks/useStartupContext'
import { startupKeys, type StartupContext } from '@/lib/startup'
import type { StartupDepartment } from '@/lib/startup'
import { createClient } from '@/lib/supabase/client'
import type { ProfileWithDepartments } from '@/lib/types'

type AuthContextValue = {
  user: ProfileWithDepartments | null
  departments: StartupDepartment[]
  isLoading: boolean
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; userId: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ error: string | null }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toUser(ctx: StartupContext): ProfileWithDepartments | null {
  if (!ctx.profile) return null
  return { ...ctx.profile, memberships: ctx.memberships }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [authResolved, setAuthResolved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT') {
        window.location.replace('/login')
        return
      }
      if (event === 'PASSWORD_RECOVERY') {
        window.location.replace('/reset-password?recovery=1')
        return
      }
      setUserId(session?.user?.id ?? null)
      setAuthResolved(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Shell context is cached by React Query (keyed by userId, with a stale
  // window), so navigations within that window reuse it instead of refetching.
  const { data: ctx, isLoading: ctxLoading } = useStartupContext(userId)
  const user = ctx ? toUser(ctx) : null
  const departments: StartupDepartment[] = ctx?.departments ?? []
  // Loading until auth resolves; thereafter only while a signed-in user's shell
  // is still fetching. A signed-out session settles immediately.
  const isLoading = !authResolved || (userId != null && ctxLoading)

  async function signIn(email: string, password: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null, userId: data.user?.id ?? null }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Navigation is handled by the SIGNED_OUT event in onAuthStateChange above
  }

  async function signInWithGoogle() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error: error?.message ?? null }
  }

  async function refreshUser() {
    if (!userId) return
    await queryClient.invalidateQueries({ queryKey: startupKeys.context(userId) })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        departments,
        isLoading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
