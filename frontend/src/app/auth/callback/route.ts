import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const role = searchParams.get("role");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const targetUrl = role ? `${origin}/auth/sync?role=${encodeURIComponent(role)}` : `${origin}/auth/sync`;
      return NextResponse.redirect(targetUrl);
    }

    console.error("Supabase OAuth code exchange error:", error);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
