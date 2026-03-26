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

    async function handleCallback() {
      // Parse hash fragment — Supabase invite/magic-link emails use implicit
      // flow and put tokens in the hash, not as a ?code= query param.
      const hash = window.location.hash.slice(1)
      const hashParams = new URLSearchParams(hash)

      const errorCode = hashParams.get('error_code')
      if (errorCode) {
        router.replace('/login?error=invalid_link')
        return
      }

      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        router.replace(error ? '/login?error=invalid_link' : next)
        return
      }

      // PKCE code flow (OAuth, newer magic links)
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        router.replace(error ? '/login?error=invalid_link' : next)
        return
      }

      router.replace('/login?error=invalid_link')
    }

    void handleCallback()
  }, [next, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  )
}
