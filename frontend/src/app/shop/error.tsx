"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.warn("Marketplace feed notice:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-6 text-neutral-900 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200/90 shadow-xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#C85A32] flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
          <AlertCircle size={28} />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
          {t("error_feed_title", "Marketplace Temporarily Unavailable")}
        </h2>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          {t("error_feed_sub", "We could not reach the artisan registry. Please check your internet connection or try reloading.")}
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#C85A32] hover:bg-[#B34D27] text-white text-xs sm:text-sm font-bold transition shadow-md active:scale-95 cursor-pointer"
        >
          <RefreshCw size={15} />
          <span>{t("retry", "Reload Marketplace")}</span>
        </button>
      </div>
    </div>
  );
}
