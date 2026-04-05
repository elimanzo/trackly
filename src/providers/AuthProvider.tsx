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
  signInWithGoogle: () => Promise<{ error: string | null }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<ProfileWithDepartments | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      *,
      user_org_memberships ( org_id, role, invite_status ),
      user_departments ( department_id, org_id, departments ( id, name ) )
    `
    )
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  type MembershipRow = { org_id: string; role: string; invite_status: string }
  type UDRow = {
    department_id: string
    org_id: string
    departments: { id: string; name: string } | null
  }

  // Phase 1: use the first membership as the active org context.
  // Phase 2 will replace this with URL-based org selection.
  const memberships = (data.user_org_memberships as MembershipRow[]) ?? []
  const activeMembership = memberships[0] ?? null

  const allDepts = (data.user_departments as UDRow[]) ?? []
  const scopedDepts = activeMembership
    ? allDepts.filter((ud) => ud.org_id === activeMembership.org_id)
    : []

  return {
    id: data.id as string,
    orgId: activeMembership?.org_id ?? null,
    fullName: data.full_name as string,
    email: data.email as string,
    avatarUrl: (data.avatar_url as string | null) ?? null,
    role: (activeMembership?.role ?? 'viewer') as ProfileWithDepartments['role'],
    inviteStatus: (activeMembership?.invite_status ??
      'pending') as ProfileWithDepartments['inviteStatus'],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    departmentIds: scopedDepts.map((ud) => ud.department_id),
    departmentNames: scopedDepts.map((ud) => ud.departments?.name ?? ''),
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

  async function signInWithGoogle() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error: error?.message ?? null }
  }

  async function refreshUser() {
    const supabase = createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) return
    const profile = await fetchProfile(authUser.id)
    setUser(profile)
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signIn, signUp, signOut, signInWithGoogle, refreshUser }}
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
