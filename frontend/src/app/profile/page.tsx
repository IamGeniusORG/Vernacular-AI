/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import {
  Camera,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Globe,
  Coins,
  Heart,
  ExternalLink,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  User,
} from "lucide-react";
import UniversalAvatar from "@/components/UniversalAvatar";
import UserDropdown from "@/components/UserDropdown";
import LanguageToggle from "@/components/LanguageToggle";
import { LanguageTransitionWrapper } from "@/components/LanguageTransitionProvider";
import { usePreferences } from "@/context/PreferencesContext";
import { useArtisan } from "@/context/ArtisanContext";
import { useLanguage } from "@/context/LanguageContext";
import { uploadArtisanAsset } from "@/lib/uploadAsset";
import { createClient } from "@/utils/supabase/client";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Mock saved favorites for curated buyer experience
const SAVED_FAVORITES = [
  {
    id: "fav-1",
    title: "Midnight Blue Jamdani Saree",
    artisan: "Debabrata Basak",
    district: "Nadia, West Bengal",
    priceInr: 4500,
    priceUsd: 65,
    craft: "Jamdani",
    imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
    inStock: true,
  },
  {
    id: "fav-2",
    title: "Royal Murshidabad Baluchari Silk",
    artisan: "Gopal Shil",
    district: "Murshidabad, West Bengal",
    priceInr: 8200,
    priceUsd: 110,
    craft: "Baluchari",
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
    inStock: true,
  },
  {
    id: "fav-3",
    title: "Handspun Bengal Khadi Linen",
    artisan: "Aarti Mondal",
    district: "Hooghly, West Bengal",
    priceInr: 2800,
    priceUsd: 40,
    craft: "Khadi",
    imageUrl: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
    inStock: true,
  },
];

export default function BuyerProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { currency, setCurrency, language, setLanguage } = usePreferences();
  const { t } = useLanguage();
  const {
    artisanId,
    profileName,
    setProfileName,
    avatarUrl,
    setAvatarUrl,
    userRole,
    isLoading: isAuthLoading,
  } = useArtisan();

  const [nameInput, setNameInput] = useState(profileName || "");
  const [userEmail, setUserEmail] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync initial name when profileName becomes available
  useEffect(() => {
    async function loadUserData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || "");
        const fallbackName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "";
        setNameInput((prev) => prev || profileName || fallbackName);
      }
    }
    loadUserData();
  }, [supabase, profileName]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Avatar Upload Handler
  const handleAvatarFile = async (file?: File) => {
    if (!file || !artisanId) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose a valid image file");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const uploadResult = await uploadArtisanAsset(artisanId, file, "avatar");
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || "Failed to upload avatar");
      }

      const newAvatarUrl = uploadResult.url;
      setAvatarUrl(newAvatarUrl);

      // 1. Supabase Auth update
      await supabase.auth.updateUser({
        data: { avatar_url: newAvatarUrl },
      });

      // 2. Backend API update
      try {
        await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: newAvatarUrl }),
        });
      } catch (e) {
        console.warn("Backend avatar sync notice:", e);
      }

      // 3. Supabase direct table update
      try {
        await supabase
          .from("artisans")
          .update({ avatar_url: newAvatarUrl })
          .eq("id", artisanId);
      } catch (e) {
        console.warn("Supabase direct avatar update notice:", e);
      }

      showToast("Profile photo updated successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      showToast(`Error: ${message}`);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // Display Name Save Handler
  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !artisanId) return;

    setIsSavingName(true);
    try {
      setProfileName(trimmed);

      // 1. Supabase Auth user metadata
      await supabase.auth.updateUser({
        data: { full_name: trimmed, name: trimmed },
      });

      // 2. Backend API update
      try {
        await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: trimmed }),
        });
      } catch (e) {
        console.warn("Backend name update notice:", e);
      }

      // 3. Supabase direct table update
      try {
        await supabase
          .from("artisans")
          .update({ full_name: trimmed })
          .eq("id", artisanId);
      } catch (e) {
        console.warn("Direct Supabase name update notice:", e);
      }

      showToast("Display name updated!");
    } catch (err) {
      console.error("Failed to update name:", err);
      showToast("Failed to update display name");
    } finally {
      setIsSavingName(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-amber-700" size={32} />
          <p className="text-sm font-medium text-neutral-500">{t("loading_profile", "Loading your profile...")}</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, prompt sign-in
  if (!artisanId) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between font-sans">
        <header className="px-6 py-4 border-b border-stone-200 bg-white/70 backdrop-blur-sm flex items-center justify-between">
          <Link
            href="/shop"
            className="flex items-center gap-2.5 group min-w-0"
            title="Vernacular AI Home"
          >
            <div className="relative h-7 sm:h-8 w-auto aspect-[1423/874] shrink-0 flex items-center">
              <Image
                src="/brand-hero.png"
                alt="Vernacular AI Logo"
                width={48}
                height={28}
                className="h-full w-auto object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
                priority
              />
            </div>
            <span className={`text-xl font-bold text-neutral-900 ${playfair.className}`}>
              Vernacular AI
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/login"
              className="px-4 py-2 bg-stone-900 text-white rounded-full text-xs font-semibold hover:bg-stone-800 transition shadow-sm"
            >
              {t("sign_in")}
            </Link>
          </div>
        </header>

        <LanguageTransitionWrapper as="main" className="max-w-md mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <User size={30} />
          </div>
          <h1 className={`text-2xl font-bold text-neutral-900 mb-2 ${playfair.className}`}>
            {t("buyer_account_title")}
          </h1>
          <p className="text-sm text-neutral-500 mb-6">
            {t("buyer_account_desc")}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-semibold transition shadow-md"
          >
            {t("sign_in_to_continue")}
          </button>
        </LanguageTransitionWrapper>

        <footer className="py-6 text-center text-xs text-neutral-400">
          Vernacular AI E-Commerce Enabler • 100% Direct Weaver Platform
        </footer>
      </div>
    );
  }

  const isArtisan = userRole === "artisan";

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-neutral-900 font-sans pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border border-stone-700">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header ── */}
      <header className="px-4 md:px-8 py-3.5 md:py-4 flex items-center justify-between gap-3 sticky top-0 z-30 bg-[#F9F8F6]/90 backdrop-blur-md border-b border-stone-200">
        <div className="flex items-center gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-neutral-700 rounded-full text-xs font-semibold transition border border-stone-200 shadow-sm"
          >
            <ArrowLeft size={14} />
            <span>{t("back_to_marketplace")}</span>
          </Link>
          <div className="h-4 w-px bg-stone-300 hidden sm:block"></div>
          <span className={`text-lg font-bold text-neutral-900 hidden sm:inline ${playfair.className}`}>
            {t("account_preferences")}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <UserDropdown />
        </div>
      </header>

      {/* ── Main Container ── */}
      <LanguageTransitionWrapper as="main" className="max-w-4xl mx-auto px-4 md:px-8 pt-8">
        {/* Title Banner */}
        <div className="mb-8">
          <span className="text-amber-800 uppercase tracking-widest text-xs font-bold mb-1.5 block">
            {t("patron_profile")}
          </span>
          <h1 className={`text-3xl md:text-4xl font-extrabold text-neutral-900 ${playfair.className}`}>
            {t("profile_title")}
          </h1>
          <p className="text-sm text-neutral-500 mt-1 max-w-xl">
            {t("profile_subtitle")}
          </p>
        </div>

        <div className="space-y-8">
          {/* ── Section 1: Identity & Avatar ── */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <User size={18} className="text-amber-700" />
              <h2 className={`text-xl font-bold text-neutral-900 ${playfair.className}`}>
                {t("identity_section")}
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-stone-100">
              {/* Avatar with Camera Overlay */}
              <div className="relative group shrink-0">
                <UniversalAvatar
                  name={profileName || "User"}
                  avatarUrl={avatarUrl}
                  size="2xl"
                  showBorder
                  className="shadow-md"
                />
                
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 p-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full shadow-lg border-2 border-white transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-50"
                  title="Upload profile picture"
                >
                  {isUploadingAvatar ? (
                    <Loader2 size={16} className="animate-spin text-amber-400" />
                  ) : (
                    <Camera size={16} />
                  )}
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarFile(file);
                  }}
                />
              </div>

              {/* Info details */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-neutral-900">
                    {profileName || "Valued Patron"}
                  </h3>
                  {isArtisan ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <Sparkles size={11} /> {t("artisan_partner")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <ShoppingBag size={11} /> {t("patron_buyer")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 font-mono">
                  {userEmail || "Signed in with Google"}
                </p>
                <p className="text-xs text-neutral-400 pt-1">
                  Upload a square photo (PNG, JPG, or WEBP up to 2MB). It automatically syncs to your comments and orders.
                </p>
              </div>
            </div>

            {/* Display Name Edit Form */}
            <div className="pt-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                {t("display_name")}
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your Name (e.g., Tanmay Ghosh)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-600/30 text-sm font-medium bg-stone-50/50"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={isSavingName || !nameInput.trim() || nameInput.trim() === profileName}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-semibold transition shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSavingName ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{t("save_name")}</span>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* ── Section 2: Global Preferences (Currency & Language) ── */}
          <section id="preferences" className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm scroll-mt-24">
            <div className="flex items-center gap-2 mb-6">
              <Coins size={18} className="text-amber-700" />
              <h2 className={`text-xl font-bold text-neutral-900 ${playfair.className}`}>
                {t("global_preferences")}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Currency Selector */}
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                      {t("preferred_currency")}
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {t("live_conversion")}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mb-4">
                    {t("currency_helper")}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-stone-200/70 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrency("INR");
                      showToast("Preferred currency set to INR (₹)");
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      currency === "INR"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <span>🇮🇳</span>
                    <span>INR (₹)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrency("USD");
                      showToast("Preferred currency set to USD ($)");
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      currency === "USD"
                        ? "bg-stone-900 text-white shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <span>🌍</span>
                    <span>USD ($)</span>
                  </button>
                </div>

                <div className="mt-3 text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                  <span>
                    {currency === "INR"
                      ? "Zero-fee direct UPI payment QR will be shown by default."
                      : "PayPal Sandbox international checkout in USD will be shown by default."}
                  </span>
                </div>
              </div>

              {/* Language Selector */}
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                      {t("preferred_language")}
                    </span>
                    <Globe size={15} className="text-neutral-400" />
                  </div>
                  <p className="text-xs text-neutral-500 mb-4">
                    {t("language_desc")}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-1.5 bg-stone-200/70 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage("en");
                      showToast("Language changed to English");
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      language === "en"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <span>English</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLanguage("hi");
                      showToast("भाषा हिन्दी में बदली गई");
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      language === "hi"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <span>हिन्दी</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLanguage("bn");
                      showToast("ভাষা বাংলায় পরিবর্তন করা হয়েছে");
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      language === "bn"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <span>বাংলা</span>
                  </button>
                </div>

                <div className="mt-3 text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-600 shrink-0" />
                  <span>{t("language_helper")}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Section 3: Saved Favorites / Wishlist UI Placeholder ── */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Heart size={18} className="text-rose-500 fill-rose-500" />
                <h2 className={`text-xl font-bold text-neutral-900 ${playfair.className}`}>
                  {t("saved_favorites")}
                </h2>
              </div>
              <span className="text-xs font-bold text-neutral-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                {SAVED_FAVORITES.length} {t("saved_items_count")}
              </span>
            </div>

            <p className="text-xs text-neutral-500 mb-6">
              {t("wishlist_desc")}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {SAVED_FAVORITES.map((item) => (
                <div
                  key={item.id}
                  className="group bg-stone-50 rounded-2xl overflow-hidden border border-stone-200/90 shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-stone-200">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-bold text-neutral-800 border border-stone-200 shadow-sm">
                      {item.craft}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className={`text-base font-bold text-neutral-900 line-clamp-1 mb-1 ${playfair.className}`}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        by <span className="font-semibold text-neutral-700">{item.artisan}</span> • {item.district}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-700 bg-stone-100/90 px-2.5 py-1 rounded-full border border-stone-200/70">
                        <Sparkles size={11} className="text-amber-700" />
                        <span>{t("direct_from_weaver")}</span>
                      </span>

                      <Link
                        href="/shop"
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                      >
                        <span>{t("view")}</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </LanguageTransitionWrapper>
    </div>
  );
}
