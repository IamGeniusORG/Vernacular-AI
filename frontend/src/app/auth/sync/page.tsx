"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useArtisan } from "@/context/ArtisanContext";
import { Playfair_Display } from "next/font/google";
import { Loader2, Sparkles } from "lucide-react";

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
        // 1. Get authenticated user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("No active user session found:", userError);
          router.push("/login?error=session_missing");
          return;
        }

        // 2. Read intended role from URL query param first, then localStorage
        const paramRole = searchParams.get("role");
        const storedRole =
          typeof window !== "undefined"
            ? localStorage.getItem("intended_role")
            : null;

        const targetRole =
          paramRole === "artisan" || storedRole === "artisan"
            ? "artisan"
            : "customer";

        const googleName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split("@")[0] : "New Artisan");

        if (mounted) {
          setSyncStatus(
            targetRole === "artisan"
              ? "Setting up your Artisan Studio..."
              : "Preparing Discovery Marketplace..."
          );
        }

        // 3. Update profile via Backend API (bypasses RLS with service_role)
        const updatePayload: { user_role: string; full_name?: string } = {
          user_role: targetRole,
        };
        if (googleName && googleName !== "New Artisan") {
          updatePayload.full_name = googleName;
        }

        try {
          const apiBase =
            process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
          await fetch(`${apiBase}/api/v1/artisans/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload),
          });
        } catch (apiErr) {
          console.error("Backend artisan sync error:", apiErr);
        }

        // Also execute client-side update
        try {
          await supabase
            .from("artisans")
            .update(updatePayload)
            .eq("id", user.id);
        } catch (dbErr) {
          console.error("Supabase client update error:", dbErr);
        }

        // 4. Update global context
        setUserRole(targetRole);
        await refreshProfile();

        // 5. Clear localStorage intended_role
        if (typeof window !== "undefined") {
          localStorage.removeItem("intended_role");
        }

        // 6. Redirect to the appropriate destination
        if (mounted) {
          if (targetRole === "artisan") {
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
