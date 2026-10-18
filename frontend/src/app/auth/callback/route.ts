import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const role = searchParams.get("role");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error || errorDescription) {
    const msg = errorDescription || error || "auth_callback_failed";
    console.error("OAuth callback error received:", msg);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const redirectBase = isLocalEnv ? origin : (forwardedHost ? `https://${forwardedHost}` : origin);
      const targetUrl = role ? `${redirectBase}/auth/sync?role=${encodeURIComponent(role)}` : `${redirectBase}/auth/sync`;
      return NextResponse.redirect(targetUrl);
    }

    console.error("Supabase OAuth code exchange error:", exchangeError);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
