"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useLanguage } from "@/context/LanguageContext";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

interface TreasureItem {
  id: string;
  title: string;
  craft: string;
  region: string;
  badge: string;
  priceInr: number;
  priceUsd: number;
  imageUrl: string;
}

const HANDPICKED_TREASURES: TreasureItem[] = [
  {
    id: "tr-1",
    title: "Midnight Blue Jamdani Muslin Saree",
    craft: "Dhakai Jamdani",
    region: "Nadia, West Bengal",
    badge: "GI Certified Weave",
    priceInr: 5800,
    priceUsd: 78,
    imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "tr-2",
    title: "Royal Murshidabad Baluchari Silk",
    craft: "Baluchari Silk",
    region: "Murshidabad, West Bengal",
    badge: "Pure Mulberry Silk",
    priceInr: 9200,
    priceUsd: 125,
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "tr-3",
    title: "Handspun Bengal Organic Khadi Linen",
    craft: "Bengal Khadi",
    region: "Hooghly, West Bengal",
    badge: "Zero Carbon Footprint",
    priceInr: 3400,
    priceUsd: 48,
    imageUrl: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "tr-4",
    title: "Traditional Phulia Taant Cotton Saree",
    craft: "Phulia Taant",
    region: "Shantipur, West Bengal",
    badge: "Breathable Summer Weave",
    priceInr: 2200,
    priceUsd: 32,
    imageUrl: "/treasures/phulia-taant.jpg",
  },
  {
    id: "tr-5",
    title: "Artisanal Kantha Stitch Heritage Saree",
    craft: "Nakshi Kantha",
    region: "Birbhum, West Bengal",
    badge: "Hand-Embroidered",
    priceInr: 6500,
    priceUsd: 88,
    imageUrl: "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "tr-6",
    title: "Begumpuri Geometric Cotton Weave",
    craft: "Begumpuri",
    region: "Hooghly, West Bengal",
    badge: "Authentic Loom Finish",
    priceInr: 2800,
    priceUsd: 38,
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
  },
];

export default function TreasuresCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 360;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const scrollToDirectory = () => {
    const el = document.getElementById("artisan-directory");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-16 md:py-24 bg-[#F5F2EB]/50 border-y border-stone-200/70 overflow-hidden">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5DFD3] text-[#78350F] text-xs font-bold tracking-wider uppercase mb-2">
              <Sparkles size={12} />
              <span>{t("treasures_curated", "Curated Heritage")}</span>
            </div>
            <h2 className={`text-2xl sm:text-3xl md:text-4xl text-neutral-900 font-bold ${playfair.className}`}>
              {t("treasures_title", "Handpicked Artisanal Treasures")}
            </h2>
            <p className="text-sm md:text-base text-neutral-600 mt-1 max-w-xl">
              {t("treasures_sub", "Authentic handloom creations directly sourced from master weaver clusters in West Bengal.")}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              aria-label="Previous treasure"
              className="w-10 h-10 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-neutral-700 flex items-center justify-center transition shadow-sm hover:scale-105 active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              aria-label="Next treasure"
              className="w-10 h-10 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-neutral-700 flex items-center justify-center transition shadow-sm hover:scale-105 active:scale-95"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Carousel Scroll Track */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide select-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {HANDPICKED_TREASURES.map((item) => {
            const displaySrc = failedImages[item.id] ? "/treasures/phulia-taant.jpg" : item.imageUrl;
            const isRemote = displaySrc.startsWith("http");

            return (
              <div
                key={item.id}
                className="w-[280px] sm:w-[320px] shrink-0 snap-start group bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Image Box */}
                <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-stone-100">
                  <Image
                    src={displaySrc}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 280px, 320px"
                    unoptimized={isRemote}
                    onError={() => setFailedImages((prev) => ({ ...prev, [item.id]: true }))}
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-neutral-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm border border-stone-200/80">
                    {item.badge}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    {item.craft}
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8B4513] block mb-1">
                      {item.region}
                    </span>
                    <h3 className={`text-base sm:text-lg font-bold text-neutral-900 line-clamp-1 mb-2 ${playfair.className}`}>
                      {item.title}
                    </h3>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between mt-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-700 bg-stone-100/90 px-2.5 py-1 rounded-full border border-stone-200/70">
                      <Sparkles size={11} className="text-[#C85A32]" />
                      <span>{t("direct_from_loom", "Direct from Loom")}</span>
                    </span>

                    <button
                      type="button"
                      onClick={scrollToDirectory}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#C85A32]/10 hover:bg-[#C85A32] text-[#C85A32] hover:text-white text-xs font-bold transition-all group-hover:translate-x-0.5"
                    >
                      <span>{t("view_weavers", "View Weavers")}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explore All Categories Action */}
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={scrollToDirectory}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-stone-50 text-neutral-900 border border-stone-300 rounded-full text-xs sm:text-sm font-bold shadow-sm hover:shadow transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>{t("explore_all_categories", "Explore All Categories & Looms")}</span>
            <ArrowRight size={15} className="text-[#C85A32]" />
          </button>
        </div>
      </div>
    </section>
  );
}
