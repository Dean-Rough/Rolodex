import { NextRequest, NextResponse } from 'next/server'

/**
 * Routes that do NOT require authentication.
 * Everything else redirects to /login if no session cookie is present.
 */
const PUBLIC_PATHS = new Set(['/login', '/register'])

/**
 * Prefixes that are always allowed through (static assets, API routes, etc).
 */
const ALWAYS_ALLOW_PREFIXES = ['/_next', '/favicon', '/api']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow static assets and Next.js internals
  if (ALWAYS_ALLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Allow public routes
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  // Check for session cookie
  const session = request.cookies.get('rolodex_session')
  if (!session?.value) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
