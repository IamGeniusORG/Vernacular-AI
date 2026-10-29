"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function Marquee() {
  const { t } = useLanguage();

  const directText = t("marquee_direct", "✨ 100% Direct-to-Weaver");
  const zeroCommText = t("marquee_zero_comm", "Zero Platform Commission");
  const heritageText = t("marquee_heritage", "Authentic Handcrafted Heritage ✨");

  return (
    <div className="w-full overflow-hidden bg-stone-900 text-stone-50 py-2.5 border-b border-stone-800 flex whitespace-nowrap select-none">
      <div className="flex animate-marquee min-w-full shrink-0 items-center justify-around">
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">{directText}</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase text-amber-500">•</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">{zeroCommText}</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase text-amber-500">•</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">{heritageText}</span>
      </div>
      {/* Duplicate for seamless looping */}
      <div aria-hidden="true" className="flex animate-marquee min-w-full shrink-0 items-center justify-around">
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">{directText}</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase text-amber-500">•</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">{zeroCommText}</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase text-amber-500">•</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">{heritageText}</span>
      </div>
    </div>
  );
}
