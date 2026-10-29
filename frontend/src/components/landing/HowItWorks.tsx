"use client";

import React from "react";
import Link from "next/link";
import {
  Compass,
  ShoppingBag,
  Truck,
  Heart,
  UserPlus,
  Mic,
  QrCode,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export default function HowItWorks() {
  const scrollToDirectory = () => {
    const el = document.getElementById("artisan-directory");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const buyerSteps = [
    {
      num: "01",
      icon: Compass,
      title: "Browse unique items",
      desc: "Explore master weavers and listen to their authentic loom stories in native Bengali, Hindi, or English.",
    },
    {
      num: "02",
      icon: ShoppingBag,
      title: "Add to cart / Direct Pay",
      desc: "Checkout directly via instant 0% fee UPI QR (India) or protected PayPal Sandbox (Worldwide in USD).",
    },
    {
      num: "03",
      icon: Truck,
      title: "Fast insured shipping",
      desc: "Your piece is packaged with care directly at rural weaving clusters in Nadia, Murshidabad, and Hooghly.",
    },
    {
      num: "04",
      icon: Heart,
      title: "Enjoy your craft",
      desc: "Own a certified, living piece of Indian handloom heritage with zero middleman markups.",
    },
  ];

  const artisanSteps = [
    {
      num: "01",
      icon: UserPlus,
      title: "Create account",
      desc: "Sign up in 30 seconds using Google or your phone number. Instant verified weaver profile creation.",
    },
    {
      num: "02",
      icon: Mic,
      title: "List your products",
      desc: "Snap photos and hold the mic to describe in your native language. Gemini 2.5 Flash crafts English titles & dual pricing.",
    },
    {
      num: "03",
      icon: QrCode,
      title: "Receive orders directly",
      desc: "Customer payments go directly to your own UPI ID or PayPal account. 100% direct with 0% platform commission.",
    },
    {
      num: "04",
      icon: TrendingUp,
      title: "Grow your business",
      desc: "Reach patrons across 120+ countries and build sovereign digital identity for your generation-old craft.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-[#FAF8F5]">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#8B4513] uppercase tracking-widest text-xs font-bold mb-2 block">
            Ecosystem Architecture
          </span>
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 mb-4 ${playfair.className}`}>
            How Vernacular AI Works
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base">
            A dual-sided ecosystem removing language, technological, and currency barriers for rural weavers and global patrons.
          </p>
        </div>

        {/* Two-Column Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
          {/* ── Left Column: For Buyers ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-stone-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between border-b border-stone-100 pb-5 mb-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C85A32]">
                    For Patrons & Collectors
                  </span>
                  <h3 className={`text-2xl font-bold text-neutral-900 mt-1 ${playfair.className}`}>
                    For Buyers
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#FDF6F0] text-[#C85A32] flex items-center justify-center">
                  <ShoppingBag size={24} />
                </div>
              </div>

              {/* Steps list */}
              <div className="space-y-6">
                {buyerSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 text-neutral-800 font-mono text-xs font-bold">
                        <Icon size={18} className="text-neutral-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-neutral-900 mb-0.5">
                          {step.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-stone-100">
              <button
                type="button"
                onClick={scrollToDirectory}
                className="w-full py-3.5 px-6 rounded-full bg-[#C85A32] hover:bg-[#B34D27] text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2 group"
              >
                <span>Start Shopping</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* ── Right Column: For Artisans ── */}
          <div className="bg-[#F8F9F5] rounded-3xl p-6 sm:p-8 md:p-10 border border-[#E0E5DA] shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-5 mb-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2E5A36]">
                    For Rural Weavers & Cooperatives
                  </span>
                  <h3 className={`text-2xl font-bold text-neutral-900 mt-1 ${playfair.className}`}>
                    For Artisans
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#EDF3EC] text-[#2E5A36] flex items-center justify-center">
                  <Mic size={24} />
                </div>
              </div>

              {/* Steps list */}
              <div className="space-y-6">
                {artisanSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#D5DDCF] flex items-center justify-center shrink-0 text-neutral-800 font-mono text-xs font-bold shadow-2xs">
                        <Icon size={18} className="text-[#2E5A36]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-bold text-neutral-900 mb-0.5">
                          {step.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-stone-200/60">
              <Link
                href="/studio"
                className="w-full py-3.5 px-6 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2 group text-center"
              >
                <span>Become an Artisan</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
