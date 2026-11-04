import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Never block root path or interfere with server-side redirects
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next()
  }

  try {
    return await updateSession(request)
  } catch (err) {
    console.warn('[Middleware] Supabase session error:', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js & manifest.json (PWA service worker & manifest)
     * - static file extensions (svg, png, jpg, jpeg, gif, webp, ico, webm, mp4, etc.)
     * - /api/ & /health endpoints
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|api/|health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webm|mp4|json|js|css)$).*)',
  ],
}
