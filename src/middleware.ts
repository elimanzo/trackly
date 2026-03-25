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
  // Invite acceptance and auth callback must bypass all org/onboarding guards
  const isInviteRoute = pathname.startsWith('/invite') || pathname.startsWith('/auth')
  const isAppRoute =
    !isAuthRoute &&
    !isOnboardingRoute &&
    !isInviteRoute &&
    pathname !== '/' &&
    !pathname.startsWith('/_next')

  if (!user) {
    if (isAppRoute || isOnboardingRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Invite/callback routes are accessible without auth (callback establishes session)
    return supabaseResponse
  }

  // Authenticated — check org membership via DB (single primary-key lookup)
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  const hasOrg = !!profile?.org_id

  // Already logged in → don't show auth pages
  if (isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Invite routes: always let through regardless of org status
  if (isInviteRoute) {
    return supabaseResponse
  }

  // Has org → don't show org creation page
  if (hasOrg && pathname.startsWith('/org/new')) {
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
