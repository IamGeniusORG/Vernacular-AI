"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Playfair_Display } from "next/font/google";
import { Loader2, ShoppingBag, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

function LoginContent() {
  const searchParams = useSearchParams();
  const paramError = searchParams.get("error");
  const derivedError =
    paramError === "auth_callback_failed" || paramError === "auth_failed"
      ? "Authentication failed or was cancelled. Please try again."
      : paramError === "session_missing"
      ? "Session expired or missing. Please sign in again."
      : paramError
      ? "An error occurred during sign in. Please try again."
      : "";

  const [selectedRole, setSelectedRole] = useState<"customer" | "artisan">("customer");
  const [isLoading, setIsLoading] = useState(false);
  const [customError, setCustomError] = useState("");
  const errorMsg = customError || derivedError;
  const supabase = createClient();
  const { t } = useLanguage();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setCustomError("");

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("intended_role", selectedRole);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}`,
        },
      });

      if (error) {
        setCustomError(error.message);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to initiate sign in";
      setCustomError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center p-4 relative font-sans">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-200">
        {/* Header Banner */}
        <div className="bg-neutral-900 px-8 py-10 text-center text-white">
          <h1 className={`text-3xl mb-2 tracking-tight ${playfair.className}`}>
            {t("login_title")}
          </h1>
          <p className="text-neutral-400 text-sm font-light">
            {t("login_subtitle")}
          </p>
        </div>

        <div className="p-8 space-y-6">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm border border-red-100 flex items-center gap-2">
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Select Your Role
            </label>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole("customer")}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                  selectedRole === "customer"
                    ? "border-neutral-900 bg-stone-50 shadow-sm"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        selectedRole === "customer"
                          ? "bg-neutral-900 text-white"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      <ShoppingBag size={16} />
                    </div>
                    <span className="font-bold text-neutral-900 text-base">
                      I want to shop
                    </span>
                  </div>
                  {selectedRole === "customer" && (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-900 text-white rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 mt-2 pl-10.5">
                  Discover authentic handlooms directly from weavers.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole("artisan")}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                  selectedRole === "artisan"
                    ? "border-amber-700 bg-amber-50/40 shadow-sm"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        selectedRole === "artisan"
                          ? "bg-amber-700 text-white"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      <Sparkles size={16} />
                    </div>
                    <span className="font-bold text-neutral-900 text-base">
                      I am an artisan
                    </span>
                  </div>
                  {selectedRole === "artisan" && (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-amber-700 text-white rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 mt-2 pl-10.5">
                  Sell my craft and digitize my catalog with AI.
                </div>
              </button>
            </div>
          </div>

          {/* Google Sign In Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-white hover:bg-stone-50 text-neutral-900 border border-stone-300 hover:border-stone-400 rounded-2xl text-base font-semibold flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin text-neutral-600" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{t("google_sign_in")}</span>
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-neutral-400">
            Secure 1-Tap authentication powered by Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center">
          <Loader2 className="animate-spin text-neutral-400" size={32} />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
