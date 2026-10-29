"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, ArrowRight, Sparkles, Heart } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useLanguage } from "@/context/LanguageContext";
import { useArtisan } from "@/context/ArtisanContext";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export default function LandingFooter() {
  const { t } = useLanguage();
  const { userRole } = useArtisan();
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes("@")) {
      setIsSubscribed(true);
      setEmail("");
    }
  };

  const scrollToDirectory = () => {
    const el = document.getElementById("artisan-directory");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-[#1C1917] text-white overflow-hidden">
      {/* ── 1. Stay Connected Newsletter Signup Banner ── */}
      <div className="border-b border-stone-800 bg-[#292524] py-14">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl text-center lg:text-left">
              <span className="text-[#D97706] text-xs font-bold uppercase tracking-widest block mb-2">
                {t("footer_stories_badge", "Stay In The Loop")}
              </span>
              <h3 className={`text-2xl sm:text-3xl font-bold text-white mb-2 ${playfair.className}`}>
                {t("footer_stories_title", "Stories from the Loom, Directly to Your Inbox")}
              </h3>
              <p className="text-stone-400 text-xs sm:text-sm">
                {t("footer_stories_sub", "Get monthly artisan spotlights, heritage saree drops, and transparent direct-impact reports.")}
              </p>
            </div>

            <div className="w-full lg:w-auto">
              {isSubscribed ? (
                <div className="px-6 py-4 rounded-full bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <span>{t("footer_subscribed", "Thank you for joining our patron circle!")}</span>
                </div>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md"
                >
                  <div className="relative w-full">
                    <Mail
                      size={16}
                      className="absolute inset-y-0 left-4 my-auto text-stone-500"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("footer_email_placeholder", "Enter your email address...")}
                      className="w-full pl-11 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-full text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 bg-[#C85A32] hover:bg-[#B34D27] text-white font-bold text-xs sm:text-sm rounded-full transition shadow-md whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t("footer_subscribe", "Subscribe")}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Large CTA Banner: Join Our Global Artisan Marketplace ── */}
      <div className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-[#292524] to-[#1C1917] border-b border-stone-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C85A32_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest mb-4">
            <Sparkles size={13} />
            <span>{t("hero_eyebrow", "Support Fair-Trade Living Heritage")}</span>
          </span>

          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight ${playfair.className}`}>
            {t("footer_cta_title", "Are You a Master Weaver or Weaver Cooperative?")}
          </h2>

          <p className="text-stone-300 text-sm sm:text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed font-light">
            {t("footer_cta_sub", "Join over 10,000 artisans across Bengal taking their generational craft direct to global buyers. Zero platform fee, voice-only setup, instant payouts.")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={scrollToDirectory}
              className="w-full sm:w-auto px-8 py-4 bg-[#C85A32] hover:bg-[#B34D27] text-white rounded-full font-bold text-sm shadow-xl hover:shadow-2xl transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>{t("hero_start_shopping", "Shop Unique Crafts")}</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>

            {userRole === "customer" ? (
              <div
                title="Artisan Studio is reserved for verified artisan accounts (Currently logged in as Patron / Buyer)"
                className="w-full sm:w-auto px-8 py-4 bg-stone-800/80 text-stone-500 border border-stone-700 rounded-full font-bold text-sm text-center cursor-not-allowed select-none opacity-50 flex items-center justify-center gap-2"
              >
                <span>{t("footer_cta_btn", "Open Your Artisan Studio")}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-700 text-stone-400">
                  Artisan Only
                </span>
              </div>
            ) : (
              <Link
                href="/studio"
                className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-white/10 text-stone-200 border border-stone-600 rounded-full font-bold text-sm transition text-center"
              >
                {t("footer_cta_btn", "Open Your Artisan Studio")}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Standard Footer Links (4-Column Grid) ── */}
      <div className="py-16 border-b border-stone-800">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {/* Col 1: Shop */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-4">
                {t("footer_col_shop", "Shop Heritage")}
              </h4>
              <ul className="space-y-2.5 text-xs text-stone-400">
                <li>
                  <button onClick={scrollToDirectory} className="hover:text-white transition">{t("footer_all_sarees", "All Handloom Sarees")}</button>
                </li>
                <li>
                  <button onClick={scrollToDirectory} className="hover:text-white transition">{t("footer_jamdani", "Dhakai Jamdani")}</button>
                </li>
                <li>
                  <button onClick={scrollToDirectory} className="hover:text-white transition">{t("footer_baluchari", "Murshidabad Baluchari Silk")}</button>
                </li>
                <li>
                  <button onClick={scrollToDirectory} className="hover:text-white transition">{t("footer_taant", "Phulia Taant Cotton")}</button>
                </li>
                <li>
                  <button onClick={scrollToDirectory} className="hover:text-white transition">{t("footer_khadi", "Bengal Khadi Linen")}</button>
                </li>
              </ul>
            </div>

            {/* Col 2: Sell */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-4">
                {t("footer_col_weavers", "Master Weavers")}
              </h4>
              <ul className="space-y-2.5 text-xs text-stone-400">
                {userRole === "customer" ? (
                  <>
                    <li title="Artisan Studio is reserved for verified artisan accounts (Currently logged in as Patron / Buyer)">
                      <span className="text-stone-600 cursor-not-allowed select-none opacity-50 flex items-center justify-between">
                        <span>{t("studio_dashboard", "Artisan Studio Dashboard")}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 bg-stone-800 text-stone-500 rounded">Artisan</span>
                      </span>
                    </li>
                    <li title="Artisan Studio is reserved for verified artisan accounts (Currently logged in as Patron / Buyer)">
                      <span className="text-stone-600 cursor-not-allowed select-none opacity-50 flex items-center justify-between">
                        <span>{t("generate_btn", "Voice Catalog Generator")}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 bg-stone-800 text-stone-500 rounded">Artisan</span>
                      </span>
                    </li>
                    <li title="Artisan Studio is reserved for verified artisan accounts (Currently logged in as Patron / Buyer)">
                      <span className="text-stone-600 cursor-not-allowed select-none opacity-50 flex items-center justify-between">
                        <span>{t("upi_id_label", "Direct UPI Payout Setup")}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 bg-stone-800 text-stone-500 rounded">Artisan</span>
                      </span>
                    </li>
                    <li title="Artisan Studio is reserved for verified artisan accounts (Currently logged in as Patron / Buyer)">
                      <span className="text-stone-600 cursor-not-allowed select-none opacity-50 flex items-center justify-between">
                        <span>{t("international_shipping", "PayPal Sandbox Export")}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 bg-stone-800 text-stone-500 rounded">Artisan</span>
                      </span>
                    </li>
                    <li>
                      <Link href="/login" className="hover:text-white transition">{t("sign_in", "Switch / Log in as Artisan")}</Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link href="/studio" className="hover:text-white transition">{t("studio_dashboard", "Artisan Studio Dashboard")}</Link>
                    </li>
                    <li>
                      <Link href="/studio" className="hover:text-white transition">{t("generate_btn", "Voice Catalog Generator")}</Link>
                    </li>
                    <li>
                      <Link href="/studio" className="hover:text-white transition">{t("upi_id_label", "Direct UPI Payout Setup")}</Link>
                    </li>
                    <li>
                      <Link href="/studio" className="hover:text-white transition">{t("international_shipping", "PayPal Sandbox Export")}</Link>
                    </li>
                    <li>
                      <Link href="/login" className="hover:text-white transition">{t("sign_in", "Weaver Community Login")}</Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Col 3: Help & Support */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-4">
                {t("footer_col_about", "Help & Payouts")}
              </h4>
              <ul className="space-y-2.5 text-xs text-stone-400">
                <li>
                  <a href="#faq" className="hover:text-white transition">{t("nav_faq", "Frequently Asked Questions")}</a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition">{t("nav_how_it_works", "How It Works")}</a>
                </li>
                <li>
                  <a href="#why-us" className="hover:text-white transition">{t("nav_why_us", "Why Vernacular AI")}</a>
                </li>
                <li>
                  <Link href="/profile" className="hover:text-white transition">{t("profile_link", "Patron Preferences")}</Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Legal & Cultural */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-4">
                {t("footer_col_legal", "Provenance & Legal")}
              </h4>
              <ul className="space-y-2.5 text-xs text-stone-400">
                <li>
                  <span className="text-stone-400">Geographical Indications (GI)</span>
                </li>
                <li>
                  <span className="text-stone-400">Silk Mark Certified Sourcing</span>
                </li>
                <li>
                  <span className="text-stone-400">{t("zero_commission", "Zero Commission Charter")}</span>
                </li>
                <li>
                  <span className="text-stone-400">{t("bengal_handloom_ai", "Bengal Handloom AI")}</span>
                </li>
                <li>
                  <span className="text-stone-400">Seva Innovation Challenge</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Attribution Bar ── */}
      <div className="py-6 bg-[#141210]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span>{t("footer_copyright", "© 2026 Vernacular AI E-Commerce Enabler. All rights reserved.")}</span>
          </div>

          <div className="flex items-center gap-1.5 text-stone-400">
            <span>{t("footer_crafted_with", "Crafted with")}</span>
            <Heart size={13} className="text-rose-500 fill-rose-500" />
            <span>{t("footer_for_weavers", "for rural Indian weavers & the global diaspora.")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
