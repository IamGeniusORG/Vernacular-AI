"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const artisanId = params?.artisan_id as string | undefined;
  const { t } = useLanguage();

  useEffect(() => {
    console.warn("Product page route notice:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-neutral-900 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200/90 shadow-xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#C85A32] flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
          <AlertCircle size={28} />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
          {t("item_unavailable_title", "This Item is Currently Unavailable")}
        </h2>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          {t("item_unavailable_sub", "We could not load this product. The artisan may have updated their catalog.")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>{t("retry", "Try Again")}</span>
          </button>

          <Link
            href={artisanId ? `/shop/${artisanId}` : "/shop"}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#C85A32] hover:bg-[#B34D27] text-white text-xs font-bold transition shadow-sm active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>{artisanId ? t("back_to_catalog", "Return to Storefront") : t("back_to_market", "Explore Marketplace")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
