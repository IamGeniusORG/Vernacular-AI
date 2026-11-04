import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const isHttps =
    request.headers.get('x-forwarded-proto') === 'https' ||
    process.env.NODE_ENV === 'production'

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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              path: options?.path ?? '/',
              sameSite: options?.sameSite ?? 'lax',
              secure: isHttps,
            })
          )
        },
      },
    }
  )

  // Safely refresh session without crashing or timing out if network is degraded
  try {
    await supabase.auth.getUser()
  } catch (err) {
    console.warn('[Middleware] Supabase auth refresh notice:', err)
  }

  return supabaseResponse
}
