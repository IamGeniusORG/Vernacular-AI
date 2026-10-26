import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const role = requestUrl.searchParams.get("role");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Determine origin safely behind Render reverse proxy
  const isLocalEnv = process.env.NODE_ENV === "development";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    requestUrl.host;
  const isHttps =
    request.headers.get("x-forwarded-proto") === "https" ||
    (!isLocalEnv && !host.includes("localhost") && !host.includes("127.0.0.1"));
  const origin = isLocalEnv ? requestUrl.origin : `https://${host}`;

  // Handle provider-level OAuth errors
  if (error || errorDescription) {
    const msg = errorDescription || error || "auth_callback_failed";
    console.error("OAuth callback error received:", msg);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }

  if (code) {
    const cookieStore = await cookies();
    const targetPath = role ? `/auth/sync?role=${encodeURIComponent(role)}` : `/auth/sync`;
    const targetUrl = `${origin}${targetPath}`;

    // Create the redirect response upfront so all Supabase session cookies are attached directly
    const response = NextResponse.redirect(targetUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // 1. Set on Server Component cookie store
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Ignore if called in immutable context
              }

              // 2. CRITICAL: Explicitly attach Set-Cookie to outgoing redirect response for Render HTTPS
              response.cookies.set(name, value, {
                ...options,
                path: options?.path ?? "/",
                sameSite: options?.sameSite ?? "lax",
                secure: isHttps || process.env.NODE_ENV === "production",
              });
            });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      console.log(`[auth/callback] Code exchange successful. Forwarding session cookies to: ${targetUrl}`);
      return response;
    }

    console.error("[auth/callback] Supabase OAuth code exchange error:", exchangeError);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message || "auth_callback_failed")}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
