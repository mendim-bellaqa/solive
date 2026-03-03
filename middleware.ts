import { NextResponse, type NextRequest } from 'next/server'

// Lightweight middleware — no Supabase SDK in Edge runtime
// Auth is validated properly in each server page/route
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Supabase stores session in cookies named: sb-<project-ref>-auth-token
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

  // Send unauthenticated users to login
  if (!hasSession && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Send logged-in users straight to the studio
  if (hasSession && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
