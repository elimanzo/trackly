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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // PASSWORD_RECOVERY  — PKCE reset code was just exchanged
      // SIGNED_IN          — fresh exchange (invite, OAuth)
      // INITIAL_SESSION    — exchange already completed before we subscribed
      //                      (AuthProvider processed the token first); session
      //                      is non-null if the exchange succeeded
      const succeeded =
        event === 'PASSWORD_RECOVERY' ||
        (event === 'SIGNED_IN' && !!session) ||
        (event === 'INITIAL_SESSION' && !!session)

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
