"use client";

import React from "react";
import {
  Award,
  Globe,
  HeartHandshake,
  Mic,
  Coins,
  Sparkles,
  Zap,
  BarChart3,
  ShieldCheck,
  Share2,
  BadgeCheck,
  Lock,
  UserCheck,
} from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useLanguage } from "@/context/LanguageContext";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export default function TrustSections() {
  const { t } = useLanguage();

  const whyChooseFeatures = [
    {
      icon: Award,
      title: t("why_feature_1_title", "Quality Guaranteed"),
      desc: t("why_feature_1_desc", "Every textile is spun on traditional pit and frame looms with certified natural fibers and pure dyes."),
    },
    {
      icon: Globe,
      title: t("why_feature_2_title", "Worldwide Insured Shipping"),
      desc: t("why_feature_2_desc", "Direct boutique export to 120+ countries with full transit insurance and reliable tracking."),
    },
    {
      icon: HeartHandshake,
      title: t("why_feature_3_title", "Support Local Artisans"),
      desc: t("why_feature_3_desc", "100% direct-to-weaver proceeds. Zero platform cuts, zero broker extortion, and complete transparency."),
    },
    {
      icon: Mic,
      title: t("why_feature_4_title", "Vernacular AI Voice Catalogs"),
      desc: t("why_feature_4_desc", "Empowering non-English literate weavers to catalog sarees in 60s via speech in Bengali or Hindi."),
    },
    {
      icon: Coins,
      title: t("why_feature_5_title", "Dual Currency Architecture"),
      desc: t("why_feature_5_desc", "Domestic shoppers pay instantly via zero-fee UPI QR, while international patrons checkout in USD via PayPal."),
    },
    {
      icon: Sparkles,
      title: t("why_feature_6_title", "Preserving Living Heritage"),
      desc: t("why_feature_6_desc", "Direct digital sovereignty that safeguards centuries-old UNESCO-recognized craft identities."),
    },
  ];

  const empowerArtisanFeatures = [
    {
      icon: Zap,
      title: t("empower_feature_1_title", "Easy Shop Setup"),
      desc: t("empower_feature_1_desc", "No tech barriers. Snap a photo, speak your craft story, and get a live storefront link in under 60 seconds."),
    },
    {
      icon: BarChart3,
      title: t("empower_feature_2_title", "Powerful AI Analytics"),
      desc: t("empower_feature_2_desc", "Automated suggested price ranges based on weave complexity, thread count, and historical market data."),
    },
    {
      icon: ShieldCheck,
      title: t("empower_feature_3_title", "Instant Direct Payments"),
      desc: t("empower_feature_3_desc", "Zero escrow delays. Funds settle directly into your linked bank UPI ID or verified PayPal account."),
    },
    {
      icon: Share2,
      title: t("empower_feature_4_title", "Global Marketing Tools"),
      desc: t("empower_feature_4_desc", "Generate viral WhatsApp audio cards, printable shop QR flyers, and high-res export product sheets."),
    },
  ];

  const trustHighlights = [
    {
      icon: BadgeCheck,
      title: t("trust_highlight_1_title", "Verified Rural Artisans"),
      desc: t("trust_highlight_1_desc", "Every artisan profile is geotagged to their native weaving district in Bengal, guaranteeing authentic craftsmanship."),
    },
    {
      icon: Lock,
      title: t("trust_highlight_2_title", "Secure Dual-Rail Transactions"),
      desc: t("trust_highlight_2_desc", "End-to-end encrypted domestic payouts via NPCI UPI alongside full global PayPal Buyer Protection."),
    },
    {
      icon: UserCheck,
      title: t("trust_highlight_3_title", "Direct Weaver Protection"),
      desc: t("trust_highlight_3_desc", "Patrons receive direct provenance audio with each creation, bridging cultural authenticity and buyer trust."),
    },
  ];

  return (
    <div id="why-us" className="bg-[#FAF8F5]">
      {/* ── 1. Why Choose Vernacular AI (6-Grid Layout) ── */}
      <section className="py-20 md:py-28 border-t border-stone-200/80">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#8B4513] uppercase tracking-widest text-xs font-bold mb-2 block">
              Ethical Heritage E-Commerce
            </span>
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 mb-4 ${playfair.className}`}>
              {t("why_choose_title", "Why Choose Vernacular AI")}
            </h2>
            <p className="text-neutral-600 text-sm sm:text-base">
              {t("why_choose_sub", "Built from the ground up to solve rural digital exclusion and eliminate middleman exploitation.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {whyChooseFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white p-7 sm:p-8 rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#F7F4EE] text-[#C85A32] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                  </div>
                  <h3 className={`text-xl font-bold text-neutral-900 mb-2 ${playfair.className}`}>
                    {feature.title}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 2. Empower Your Craft Business (4-Column Feature Row) ── */}
      <section className="py-20 bg-[#F2EFE9]/60 border-y border-stone-200/80">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[#2E5A36] uppercase tracking-widest text-xs font-bold mb-2 block">
              {t("empower_badge", "Artisan Empowerment")}
            </span>
            <h2 className={`text-3xl sm:text-4xl font-bold text-neutral-900 mb-3 ${playfair.className}`}>
              {t("empower_title", "Empowering Artisans at Every Step")}
            </h2>
            <p className="text-neutral-600 text-sm">
              {t("empower_sub", "Tools designed specifically for rural weavers to build, manage, and scale their craft business.")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {empowerArtisanFeatures.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-300"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#EDF3EC] text-[#2E5A36] flex items-center justify-center mb-4">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-base font-bold text-neutral-900 mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. Your Trust, Our Priority (3-Column Row) ── */}
      <section className="py-20 md:py-24">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[#C85A32] uppercase tracking-widest text-xs font-bold mb-2 block">
              Integrity & Security
            </span>
            <h2 className={`text-3xl sm:text-4xl font-bold text-neutral-900 mb-3 ${playfair.className}`}>
              {t("trust_banner_title", "Empowering Generational Weaving Traditions")}
            </h2>
            <p className="text-neutral-600 text-sm">
              {t("trust_banner_desc", "Our sovereign technology directly strengthens rural handicraft clusters, providing sustainable global reach while protecting authentic heritage.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {trustHighlights.map((col) => {
              const Icon = col.icon;
              return (
                <div
                  key={col.title}
                  className="bg-white p-8 rounded-3xl border border-stone-200/90 shadow-sm flex flex-col items-center text-center hover:shadow-md transition"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#FDF6F0] text-[#C85A32] flex items-center justify-center mb-5">
                    <Icon size={28} />
                  </div>
                  <h3 className={`text-xl font-bold text-neutral-900 mb-2 ${playfair.className}`}>
                    {col.title}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {col.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
