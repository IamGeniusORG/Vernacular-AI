"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Sparkles, User, Home, Globe } from "lucide-react";
import { useArtisan } from "@/context/ArtisanContext";
import { useLanguage } from "@/context/LanguageContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { artisanId, userRole } = useArtisan();
  const { activeLanguage, setLanguage, t } = useLanguage();

  const isShopActive = pathname === "/shop" || pathname === "/" || pathname.startsWith("/shop/");
  const isStudioActive = pathname.startsWith("/studio");
  const isProfileActive = pathname.startsWith("/profile");

  const toggleNextLanguage = () => {
    if (activeLanguage === "en") setLanguage("hi");
    else if (activeLanguage === "hi") setLanguage("bn");
    else setLanguage("en");
  };

  const langLabel = activeLanguage === "en" ? "EN" : activeLanguage === "hi" ? "हिन्दी" : "বাংলা";

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-lg px-2 py-1.5 block md:hidden pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Marketplace / Explore */}
        <Link
          href="/shop"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-90 ${
            isShopActive && !isStudioActive && !isProfileActive
              ? "text-[#C85A32] font-bold"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <Store size={20} className={isShopActive && !isStudioActive && !isProfileActive ? "stroke-[2.5]" : "stroke-[1.8]"} />
          <span className="text-[10px] mt-0.5 tracking-tight">{t("nav_marketplace", "Market")}</span>
        </Link>

        {/* Studio */}
        <Link
          href="/studio"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-90 relative ${
            isStudioActive ? "text-amber-700 font-bold" : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <div className="relative">
            <Sparkles size={20} className={isStudioActive ? "stroke-[2.5]" : "stroke-[1.8]"} />
            <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">{t("nav_studio", "Studio")}</span>
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-90 ${
            isProfileActive ? "text-neutral-900 font-bold" : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <User size={20} className={isProfileActive ? "stroke-[2.5]" : "stroke-[1.8]"} />
          <span className="text-[10px] mt-0.5 tracking-tight">{t("nav_profile", "Profile")}</span>
        </Link>

        {/* Quick Language Toggle */}
        <button
          type="button"
          onClick={toggleNextLanguage}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-stone-500 hover:text-stone-900 transition-all active:scale-90"
        >
          <Globe size={19} className="stroke-[1.8] text-neutral-600" />
          <span className="text-[10px] mt-0.5 font-bold tracking-tight text-neutral-700 uppercase">{langLabel}</span>
        </button>
      </div>
    </nav>
  );
}
