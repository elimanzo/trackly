import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Detect password-recovery session by inspecting the AMR claim in the JWT.
  // Recovery sessions have amr: [{method: "recovery"}]. After updateUser()
  // succeeds the session is refreshed and the recovery method is gone.
  let isRecoverySession = false
  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]))
        isRecoverySession =
          Array.isArray(payload.amr) &&
          payload.amr.some((a: { method: string }) => a.method === 'recovery')
      } catch {
        // malformed token — treat as normal session
      }
    }
  }

  const { pathname } = request.nextUrl

  // login/signup — redirect authenticated users away to dashboard
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  // public routes — accessible by anyone, no redirects in either direction
  const isPublicRoute =
    pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')
  const isOnboardingRoute = pathname.startsWith('/org') || pathname.startsWith('/setup')
  // Auth callback must be reachable without a session — it's what establishes one
  const isAuthCallback = pathname.startsWith('/auth')
  // Invite accept requires a session but must skip the "no org" redirect
  const isInviteAccept = pathname.startsWith('/invite')
  const isAppRoute =
    !isAuthRoute &&
    !isPublicRoute &&
    !isOnboardingRoute &&
    !isAuthCallback &&
    !isInviteAccept &&
    pathname !== '/' &&
    !pathname.startsWith('/_next')

  if (!user) {
    if (isAuthCallback || isPublicRoute) return supabaseResponse
    if (isAppRoute || isOnboardingRoute || isInviteAccept) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Authenticated — check org membership via DB (single primary-key lookup)
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  const hasOrg = !!profile?.org_id

  // Auth callback must always run — it may replace the current session (invite flow)
  // Public routes (forgot/reset password) are always accessible regardless of auth state
  if (isAuthCallback || isPublicRoute) return supabaseResponse

  // Unconfirmed email — session exists but email not yet verified.
  // Invite users have email_confirmed_at set when they claim their invite link,
  // so this only blocks self-signup accounts that haven't clicked the confirmation email.
  if (!user.email_confirmed_at) {
    if (isAuthRoute) return supabaseResponse
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = '?error=confirm_email'
    return NextResponse.redirect(url)
  }

  // Recovery session — block access to the app until password is set.
  // Auth routes (login/signup) are let through so the user can abandon the flow.
  if (isRecoverySession) {
    if (isAuthRoute) return supabaseResponse
    if (isAppRoute || isOnboardingRoute || isInviteAccept) {
      const url = request.nextUrl.clone()
      url.pathname = '/reset-password'
      url.search = '?recovery=1'
      return NextResponse.redirect(url)
    }
  }

  // Already logged in → don't show auth pages
  if (isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Invite accept: authenticated user, skip org check (page validates the invite)
  if (isInviteAccept) {
    return supabaseResponse
  }

  // Has org → onboarding is done, redirect away from all onboarding routes
  if (hasOrg && isOnboardingRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // No org yet → must complete onboarding first
  if (!hasOrg && isAppRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/org/new'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
