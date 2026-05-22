import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Zustand persist stores in a cookie-accessible way via localStorage, but middleware
  // runs on edge — we use a simple cookie-based token check.
  // The LoginForm sets document.cookie 'has_session=1' on success.
  const hasSession = request.cookies.has('has_session')

  if (!isPublic && !hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/client/:path*', '/site/:path*'],
}
