"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useArtisan } from "@/context/ArtisanContext";
import { playfair } from "@/lib/fonts";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import type { User } from "@supabase/supabase-js";

function AuthSyncContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { setUserRole } = useArtisan();
  const [syncStatus, setSyncStatus] = useState("Authenticating...");
  const [showManualButton, setShowManualButton] = useState(false);
  const [targetDestination, setTargetDestination] = useState<string>("/shop");

  useEffect(() => {
    let mounted = true;
    let safetyTimer: NodeJS.Timeout | null = null;
    let manualButtonTimer: NodeJS.Timeout | null = null;

    async function syncProfile() {
      // 1. Resolve intended role immediately from all available sources
      const paramRole = searchParams.get("role");
      const storedIntended = typeof window !== "undefined" ? localStorage.getItem("intended_role") : null;
      const storedRole = typeof window !== "undefined" ? localStorage.getItem("user_role") : null;
      const isArtisan = paramRole === "artisan" || storedIntended === "artisan" || storedRole === "artisan";
      const resolvedRole = isArtisan ? "artisan" : "customer";
      const dest = isArtisan ? "/studio" : "/shop";

      if (mounted) {
        setTargetDestination(dest);
        setSyncStatus(isArtisan ? "Setting up your Artisan Studio..." : "Preparing Discovery Marketplace...");
      }

      // Pre-seed localStorage so client context never defaults to 'customer' if 'artisan' was chosen
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("user_role", resolvedRole);
        } catch {
          // ignore
        }
      }
      setUserRole(resolvedRole);

      // Show manual fallback button after 2.0s so users are never trapped
      manualButtonTimer = setTimeout(() => {
        if (mounted) setShowManualButton(true);
      }, 2000);

      // Bulletproof Safety Guard: auto-redirect after 2.8s max even if any API stalls
      safetyTimer = setTimeout(() => {
        if (mounted) {
          console.warn("[AuthSync] Safety timer fired — redirecting to destination:", dest);
          if (typeof window !== "undefined") {
            window.location.replace(dest);
          } else {
            router.replace(dest);
          }
        }
      }, 2800);

      try {
        // 2. Check for OAuth errors
        const errorDesc = searchParams.get("error_description") || searchParams.get("error");
        if (errorDesc) {
          console.error("OAuth error received:", errorDesc);
          router.push(`/login?error=${encodeURIComponent(errorDesc)}`);
          return;
        }

        // 3. Fast Code Exchange if ?code= is present
        const code = searchParams.get("code");
        if (code) {
          try {
            const { data: sessionCheck } = await supabase.auth.getSession();
            if (!sessionCheck?.session) {
              await supabase.auth.exchangeCodeForSession(code);
            }
          } catch (codeErr) {
            console.warn("exchangeCodeForSession notice:", codeErr);
          }
        }

        // 4. Retrieve session/user (fast 3-attempt loop with 200ms delay)
        let user: User | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            user = sessionData.session.user;
            break;
          }

          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            user = userData.user;
            break;
          }

          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
          if (!mounted) return;
        }

        if (!user) {
          console.warn("[AuthSync] No user session found after fast check. Redirecting with cached credentials.");
          if (typeof window !== "undefined") {
            window.location.replace(dest);
          } else {
            router.replace(dest);
          }
          return;
        }

        const googleName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (isArtisan ? "Artisan Partner" : "Patron");
        const googleAvatar =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null;

        // 5. Update user_metadata in Supabase Auth (fast & instant session persistence)
        try {
          await supabase.auth.updateUser({
            data: {
              user_role: resolvedRole,
              full_name: googleName,
              avatar_url: googleAvatar,
            },
          });
        } catch (metaErr) {
          console.warn("[AuthSync] updateUser metadata notice:", metaErr);
        }

        // 6. Direct Supabase Database UPSERT into public.artisans table
        try {
          const upsertPayload = {
            id: user.id,
            full_name: googleName,
            user_role: resolvedRole,
            avatar_url: googleAvatar,
            preferred_currency: "INR",
            preferred_language: "en",
          };

          const upsertPromise = supabase
            .from("artisans")
            .upsert(upsertPayload, { onConflict: "id" });

          // Race with 1.8s timeout so DB slowness never traps the user
          await Promise.race([
            upsertPromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Supabase upsert timeout")), 1800)
            ),
          ]);
        } catch (dbErr) {
          console.warn("[AuthSync] Supabase upsert fallback notice:", dbErr);
          // Fallback update in case insert failed
          try {
            await supabase
              .from("artisans")
              .update({ user_role: resolvedRole })
              .eq("id", user.id);
          } catch {
            // ignore
          }
        }

        // 7. Non-blocking Backend API Sync with Bearer token & 1.5s AbortController
        (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);

            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (session?.access_token) {
              headers["Authorization"] = `Bearer ${session.access_token}`;
            }

            await fetch(`${apiBase}/api/v1/artisans/${user.id}`, {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                user_role: resolvedRole,
                full_name: googleName,
                avatar_url: googleAvatar,
              }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
          } catch {
            // Handled asynchronously in background
          }
        })();

        // 8. Clean up temporary intended role
        if (typeof window !== "undefined") {
          localStorage.removeItem("intended_role");
        }

        // 9. Clean redirect to destination
        if (mounted) {
          if (safetyTimer) clearTimeout(safetyTimer);
          if (manualButtonTimer) clearTimeout(manualButtonTimer);
          if (typeof window !== "undefined") {
            window.location.replace(dest);
          } else {
            router.replace(dest);
          }
        }
      } catch (err) {
        console.error("Error during profile sync:", err);
        if (mounted) {
          if (safetyTimer) clearTimeout(safetyTimer);
          if (typeof window !== "undefined") {
            window.location.replace(dest);
          } else {
            router.replace(dest);
          }
        }
      }
    }

    syncProfile();

    return () => {
      mounted = false;
      if (safetyTimer) clearTimeout(safetyTimer);
      if (manualButtonTimer) clearTimeout(manualButtonTimer);
    };
  }, [router, searchParams, supabase, setUserRole]);

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-stone-200 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mb-6 shadow-inner border border-amber-200/60">
          <Loader2 className="animate-spin text-amber-700" size={28} />
        </div>

        <h1
          className={`text-2xl font-bold text-neutral-900 mb-2 ${playfair.className}`}
        >
          {syncStatus}
        </h1>

        <p className="text-neutral-500 text-sm font-light flex items-center gap-1.5 justify-center mt-1">
          <Sparkles size={14} className="text-amber-700" />
          Finalizing secure authentication
        </p>

        {showManualButton && (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.replace(targetDestination);
              } else {
                router.replace(targetDestination);
              }
            }}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer animate-in fade-in duration-200"
          >
            <span>Proceed to {targetDestination === "/studio" ? "Studio" : "Marketplace"}</span>
            <ArrowRight size={14} />
          </button>
        )}
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
