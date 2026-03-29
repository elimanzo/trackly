'use client'

import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { googleSignInDestination } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'

export function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    // @supabase/ssr hardcodes flowType:'pkce' in createBrowserClient. When
    // _initialize() detects implicit-flow hash tokens (used by server-initiated
    // invite links) it throws AuthPKCEGrantCodeExchangeError and swallows the
    // error — SIGNED_IN never fires. Bypass _initialize() entirely by reading
    // the hash directly and calling setSession(), which has no flowType check.
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }: { error: { message: string } | null }) => {
          if (!cancelled) router.replace(error ? '/login?error=invalid_link' : next)
        })
      return () => {
        cancelled = true
      }
    }

    // PKCE flow (code in query param) — browser-initiated flows like password
    // reset store the code_verifier in cookies before the redirect, so
    // _initialize() can exchange the code successfully.
    const timeout = { current: undefined as ReturnType<typeof setTimeout> | undefined }
    const codeInUrl = new URL(window.location.href).searchParams.has('code')

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const isPasswordRecovery = event === 'PASSWORD_RECOVERY'
      const isSignedIn =
        (event === 'SIGNED_IN' && !!session) ||
        (!codeInUrl && event === 'INITIAL_SESSION' && !!session)

      if (isPasswordRecovery) {
        clearTimeout(timeout.current)
        subscription.unsubscribe()
        router.replace(next)
        return
      }

      if (isSignedIn) {
        clearTimeout(timeout.current)
        subscription.unsubscribe()

        // For Google OAuth (PKCE code flow with no explicit `next`), determine
        // the correct destination based on whether the user already has an org.
        if (!searchParams.get('next')) {
          const result = await googleSignInDestination()
          if (cancelled) return
          if ('error' in result) {
            router.replace('/login?error=auth_failed')
            return
          }
          // Pre-fill display name from Google profile when sending to org wizard
          if (result.destination === '/org/new' && session.user.user_metadata?.full_name) {
            const name = encodeURIComponent(session.user.user_metadata.full_name as string)
            router.replace(`/org/new?name=${name}`)
          } else {
            router.replace(result.destination)
          }
        } else {
          router.replace(next)
        }
      }
    })

    // Expired or invalid token — no success event fires within 4 s
    timeout.current = setTimeout(() => {
      subscription.unsubscribe()
      router.replace('/login?error=invalid_link')
    }, 4000)

    return () => {
      cancelled = true
      clearTimeout(timeout.current)
      subscription.unsubscribe()
    }
  }, [next, router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  )
}
