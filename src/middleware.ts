import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isOnboardingRoute = pathname.startsWith('/org') || pathname.startsWith('/setup')
  // Auth callback must be reachable without a session — it's what establishes one
  const isAuthCallback = pathname.startsWith('/auth')
  // Invite accept requires a session but must skip the "no org" redirect
  const isInviteAccept = pathname.startsWith('/invite')
  const isAppRoute =
    !isAuthRoute &&
    !isOnboardingRoute &&
    !isAuthCallback &&
    !isInviteAccept &&
    pathname !== '/' &&
    !pathname.startsWith('/_next')

  if (!user) {
    if (isAuthCallback) return supabaseResponse
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
  if (isAuthCallback) return supabaseResponse

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
