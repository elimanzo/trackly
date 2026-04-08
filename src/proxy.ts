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

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isPublicRoute =
    pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')
  const isOnboardingRoute =
    (pathname.startsWith('/org') && !pathname.startsWith('/orgs')) || pathname.startsWith('/setup')
  const isAuthCallback = pathname.startsWith('/auth')
  const isInviteAccept = pathname.startsWith('/invite')
  const isSettingsRoute = pathname.startsWith('/settings')
  // Org-scoped routes: /orgs (picker) and /orgs/[slug]/...
  const isOrgPickerRoute = pathname === '/orgs'
  const isOrgScopedRoute = pathname.startsWith('/orgs/')
  const isAccessDeniedRoute = pathname === '/orgs/access-denied'
  const isAccountRoute = pathname.startsWith('/account')

  const isAppRoute =
    !isAuthRoute &&
    !isPublicRoute &&
    !isOnboardingRoute &&
    !isAuthCallback &&
    !isInviteAccept &&
    !isSettingsRoute &&
    !isOrgPickerRoute &&
    !isOrgScopedRoute &&
    pathname !== '/' &&
    !pathname.startsWith('/_next')

  if (!user) {
    if (isAuthCallback || isPublicRoute) return supabaseResponse
    if (
      isAppRoute ||
      isOnboardingRoute ||
      isInviteAccept ||
      isSettingsRoute ||
      isOrgPickerRoute ||
      isOrgScopedRoute
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Authenticated — check org membership via DB (any active membership = has org)
  const { data: membership } = await supabase
    .from('user_org_memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .neq('invite_status', 'deactivated')
    .limit(1)
    .maybeSingle()

  const hasOrg = !!membership?.org_id

  if (isAuthCallback || isPublicRoute) return supabaseResponse

  if (!user.email_confirmed_at) {
    if (isAuthRoute) return supabaseResponse
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = '?error=confirm_email'
    return NextResponse.redirect(url)
  }

  if (isRecoverySession) {
    if (isAuthRoute) return supabaseResponse
    if (isAppRoute || isOnboardingRoute || isInviteAccept || isOrgScopedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/reset-password'
      url.search = '?recovery=1'
      return NextResponse.redirect(url)
    }
  }

  // Already logged in → don't show auth pages.
  // Server actions POST to the current page URL with a Next-Action header —
  // let those through so they can return a flight response instead of a redirect.
  if (isAuthRoute && !request.headers.has('next-action')) {
    const url = request.nextUrl.clone()
    url.pathname = '/orgs'
    return NextResponse.redirect(url)
  }

  if (isInviteAccept) return supabaseResponse

  // Let the access-denied page through — it's a valid authenticated destination
  if (isAccessDeniedRoute) return supabaseResponse

  // Account settings are user-scoped — accessible regardless of org membership
  if (isAccountRoute) return supabaseResponse

  // For org-scoped routes, verify the user is a member of the specific org in the URL.
  if (isOrgScopedRoute) {
    const slugMatch = pathname.match(/^\/orgs\/([^/]+)/)
    const routeSlug = slugMatch?.[1]

    if (routeSlug) {
      const { data: orgRow } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', routeSlug)
        .maybeSingle()

      let isMember = false
      if (orgRow?.id) {
        const { data: orgMembership } = await supabase
          .from('user_org_memberships')
          .select('org_id')
          .eq('user_id', user.id)
          .eq('org_id', orgRow.id)
          .neq('invite_status', 'deactivated')
          .maybeSingle()
        isMember = !!orgMembership
      }

      if (!isMember) {
        const url = request.nextUrl.clone()
        url.pathname = '/orgs/access-denied'
        return NextResponse.redirect(url)
      }
    }
  }

  // No org → must complete onboarding first
  if (!hasOrg) {
    if (isOnboardingRoute) return supabaseResponse
    if (isOrgPickerRoute || isOrgScopedRoute || isAppRoute || isSettingsRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/org/new'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Has org → redirect away from onboarding
  if (hasOrg && isOnboardingRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/orgs'
    return NextResponse.redirect(url)
  }

  // Old bare app routes (e.g. /dashboard, /assets) → redirect to org picker
  if (isAppRoute || isSettingsRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/orgs'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
