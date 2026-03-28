'use client'

import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { ProfileWithDepartments } from '@/lib/types'

type AuthContextValue = {
  user: ProfileWithDepartments | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<ProfileWithDepartments | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(`*, user_departments ( department_id, departments ( id, name ) )`)
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  type UDRow = { department_id: string; departments: { id: string; name: string } | null }

  return {
    id: data.id as string,
    orgId: data.org_id as string | null,
    fullName: data.full_name as string,
    email: data.email as string,
    avatarUrl: (data.avatar_url as string | null) ?? null,
    role: data.role as ProfileWithDepartments['role'],
    inviteStatus: data.invite_status as ProfileWithDepartments['inviteStatus'],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    departmentIds: (data.user_departments as UDRow[]).map((ud) => ud.department_id),
    departmentNames: (data.user_departments as UDRow[]).map((ud) => ud.departments?.name ?? ''),
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ProfileWithDepartments | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return
      if (_event === 'SIGNED_OUT') {
        window.location.replace('/login')
        return
      }
      if (_event === 'PASSWORD_RECOVERY') {
        window.location.replace('/reset-password?recovery=1')
        return
      }
      if (!session?.user) {
        setUser(null)
        setIsLoading(false)
        return
      }
      // Defer fetchProfile outside the onAuthStateChange callback to avoid a
      // Web Locks deadlock: the auth library holds a lock during this callback,
      // and fetchProfile internally acquires the same lock to read the session.
      const userId = session.user.id
      setTimeout(() => {
        if (!mounted) return
        fetchProfile(userId)
          .then((profile) => {
            if (mounted) setUser(profile)
          })
          .catch(() => {
            if (mounted) setUser(null)
          })
          .finally(() => {
            if (mounted) setIsLoading(false)
          })
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
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

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
