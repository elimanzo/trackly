'use client'

import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { createClient } from '@/lib/supabase/client'

/**
 * Handles both Supabase auth flows:
 * - PKCE: ?code=xxx  (OAuth, magic links)
 * - Implicit: #access_token=xxx (invite emails, password reset)
 *
 * The browser Supabase client automatically detects and processes both.
 * Server-side route handlers can't read URL hash fragments, so this must
 * be a client component.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  useEffect(() => {
    const supabase = createClient()

    // exchangeCodeForSession handles PKCE codes; getSession handles hash tokens.
    // Try code first, fall back to getting the current session (set by hash).
    const code = new URLSearchParams(window.location.search).get('code')

    async function handleCallback() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          router.replace('/login?error=invalid_link')
          return
        }
      } else {
        // Wait briefly for the client to process the hash tokens
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        router.replace(next)
      } else {
        router.replace('/login?error=invalid_link')
      }
    }

    void handleCallback()
  }, [next, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
    </div>
  )
}
