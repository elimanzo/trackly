'use client'

import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'

export function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  useEffect(() => {
    const supabase = createClient()
    const timeout = { current: undefined as ReturnType<typeof setTimeout> | undefined }

    // Capture synchronously before _initialize() clears the code via history.replaceState.
    // When a code is present the PKCE exchange is in-flight; INITIAL_SESSION may fire
    // with a pre-existing session before the exchange finishes, so we must wait for
    // SIGNED_IN / PASSWORD_RECOVERY. Without a code the exchange already happened
    // before this component mounted, so INITIAL_SESSION with a session means success.
    const codeInUrl = new URL(window.location.href).searchParams.has('code')

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const succeeded =
        event === 'PASSWORD_RECOVERY' ||
        (event === 'SIGNED_IN' && !!session) ||
        (!codeInUrl && event === 'INITIAL_SESSION' && !!session)

      if (succeeded) {
        clearTimeout(timeout.current)
        subscription.unsubscribe()
        router.replace(next)
      }
    })

    // Expired or invalid token — no success event fires within 4 s
    timeout.current = setTimeout(() => {
      subscription.unsubscribe()
      router.replace('/login?error=invalid_link')
    }, 4000)

    return () => {
      clearTimeout(timeout.current)
      subscription.unsubscribe()
    }
  }, [next, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  )
}
