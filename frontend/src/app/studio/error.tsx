"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.warn("Studio error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-900 select-none font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200/80">
          <AlertCircle size={28} />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
          {t("studio_error_title", "Studio Temporarily Paused")}
        </h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {t("studio_error_sub", "An error occurred while loading your studio session. Your unpublished draft photos and recorded voice stories are safely preserved in offline storage.")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>{t("retry", "Reload Studio")}</span>
          </button>

          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition active:scale-95"
          >
            <Sparkles size={14} />
            <span>{t("back_to_market", "Visit Marketplace")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
