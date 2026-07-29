import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Auth is optional — guests can use the studio without an account. This
// middleware gates nothing; it exists to refresh the Supabase session cookie.
// Access tokens are short-lived, so without a refresh on the way through, a
// returning user looks signed out until the client SDK catches up, and any
// server-rendered view disagrees with the browser.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return response   // unconfigured build — stay out of the way

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Must be getUser(), not getSession(): only getUser() revalidates against the
  // auth server, and it is the call that actually triggers the token refresh.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Everything except static assets — those never need a session.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
