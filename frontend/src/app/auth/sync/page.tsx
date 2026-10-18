"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useArtisan } from "@/context/ArtisanContext";
import { Playfair_Display } from "next/font/google";
import { Loader2, Sparkles } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

function AuthSyncContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { setUserRole, refreshProfile } = useArtisan();
  const [syncStatus, setSyncStatus] = useState("Syncing your profile...");

  useEffect(() => {
    let mounted = true;

    async function syncProfile() {
      try {
        // 1. Check if the URL has an error_description or error from Supabase/Google
        const errorDesc = searchParams.get("error_description") || searchParams.get("error");
        if (errorDesc) {
          console.error("OAuth error received from provider:", errorDesc);
          router.push(`/login?error=${encodeURIComponent(errorDesc)}`);
          return;
        }

        // 2. Check if the URL has a ?code= parameter and exchange code for session if needed
        const code = searchParams.get("code");
        if (code) {
          try {
            const { data: sessionCheck } = await supabase.auth.getSession();
            if (!sessionCheck?.session) {
              await supabase.auth.exchangeCodeForSession(code);
            }
          } catch (codeErr) {
            console.warn("exchangeCodeForSession notice (may already be exchanged):", codeErr);
          }
        }

        // 3. Retry getting session/user with 500ms delays before declaring authentication failed
        let user: User | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            user = userData.user;
            break;
          }

          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            user = sessionData.session.user;
            break;
          }

          // Delay 500ms before retrying
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (!mounted) return;
        }

        if (!user) {
          console.error("No active user session found after retry attempts");
          router.push("/login?error=session_missing");
          return;
        }

        // 4. Read intended role from localStorage (or fallback to URL param), defaulting to 'customer'
        const storedRole =
          typeof window !== "undefined"
            ? localStorage.getItem("intended_role")
            : null;
        const paramRole = searchParams.get("role");
        const intendedRole =
          storedRole === "artisan" || paramRole === "artisan"
            ? "artisan"
            : "customer";

        if (mounted) {
          setSyncStatus(
            intendedRole === "artisan"
              ? "Setting up your Artisan Studio..."
              : "Preparing Discovery Marketplace..."
          );
        }

        // 5. Update only the user_role so custom profile names are preserved
        try {
          const { error: updateErr } = await supabase
            .from("artisans")
            .update({ user_role: intendedRole })
            .eq("id", user.id);

          if (updateErr) {
            console.error("Failed to sync user role:", updateErr);
          }
        } catch (dbErr) {
          console.error("Supabase client update error:", dbErr);
        }

        // Also sync user_role via backend API with service_role key to bypass RLS
        try {
          const apiBase =
            process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
          await fetch(`${apiBase}/api/v1/artisans/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_role: intendedRole,
            }),
          });
        } catch (apiErr) {
          console.warn("Backend artisan sync notice:", apiErr);
        }

        // 6. Update global context
        setUserRole(intendedRole);
        await refreshProfile();

        // 7. Clear localStorage intended_role
        if (typeof window !== "undefined") {
          localStorage.removeItem("intended_role");
        }

        // 8. Redirect 'artisan' to /studio and 'customer' to /shop
        if (mounted) {
          if (intendedRole === "artisan") {
            router.push("/studio");
          } else {
            router.push("/shop");
          }
        }
      } catch (err) {
        console.error("Error during profile sync:", err);
        if (mounted) {
          router.push("/shop");
        }
      }
    }

    syncProfile();

    return () => {
      mounted = false;
    };
  }, [router, searchParams, supabase, setUserRole, refreshProfile]);

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-stone-200 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-neutral-800 mb-6 shadow-inner">
          <Loader2 className="animate-spin text-neutral-800" size={28} />
        </div>

        <h1
          className={`text-2xl font-bold text-neutral-900 mb-2 ${playfair.className}`}
        >
          {syncStatus}
        </h1>

        <p className="text-neutral-500 text-sm font-light flex items-center gap-1.5 justify-center mt-1">
          <Sparkles size={14} className="text-amber-700" />
          Finalizing secure Google authentication
        </p>
      </div>
    </div>
  );
}

export default function AuthSyncPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center font-sans">
          <Loader2 className="animate-spin text-neutral-400" size={32} />
        </div>
      }
    >
      <AuthSyncContent />
    </Suspense>
  );
}
