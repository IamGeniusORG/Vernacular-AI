/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Mic, MicOff, ArrowRight, Sparkles, Users, Package, Globe2 } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useArtisan } from "@/context/ArtisanContext";
import { useLanguage } from "@/context/LanguageContext";
import { Artisan } from "@/lib/api";
import Marquee from "@/components/Marquee";
import UniversalAvatar from "@/components/UniversalAvatar";
import UserDropdown from "@/components/UserDropdown";
import LanguageToggle from "@/components/LanguageToggle";
import { createClient } from "@/utils/supabase/client";

// Modular Landing Page Components
import DynamicWeaveCanvas from "@/components/DynamicWeaveCanvas";
import TreasuresCarousel from "@/components/landing/TreasuresCarousel";
import HowItWorks from "@/components/landing/HowItWorks";
import TrustSections from "@/components/landing/TrustSections";
import LandingFaq from "@/components/landing/LandingFaq";
import LandingFooter from "@/components/landing/LandingFooter";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const CRAFT_FILTERS = ["All", "Baluchari", "Taant", "Jamdani", "Khadi", "Silk"];

interface Props {
  artisans: Artisan[];
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (err: unknown) => void;
  onend: () => void;
  start: () => void;
}

type SpeechRecognitionCtor = new () => ISpeechRecognition;

export default function ShopDirectoryClient({ artisans }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCraft, setSelectedCraft] = useState("All");
  const [isListening, setIsListening] = useState(false);
  const { artisanId, userRole, refreshProfile } = useArtisan();
  const { activeLanguage, t } = useLanguage();

  // Active listener for Supabase Auth state changes to guarantee instant UI reactivity
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !artisanId) {
        refreshProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [artisanId, refreshProfile]);

  const scrollToDirectory = () => {
    const el = document.getElementById("artisan-directory");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleVoiceSearch = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const langMap: Record<string, string> = {
        en: "en-IN",
        bn: "bn-IN",
        hi: "hi-IN",
      };
      recognition.lang = langMap[activeLanguage] || "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        if (transcript) {
          setSearchQuery(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (err: unknown) => {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setIsListening(false);
    }
  };

  const filteredArtisans = artisans.filter((a) => {
    // Explicitly exclude customer accounts from the artisan marketplace directory
    if (a.user_role === "customer") {
      return false;
    }

    const q = searchQuery.toLowerCase().trim();

    // Determine artisan's craft
    const crafts = ["Jamdani", "Taant", "Silk", "Khadi", "Baluchari"];
    const craftTag = crafts[a.id.charCodeAt(0) % crafts.length];

    // Check craft filter
    if (selectedCraft !== "All") {
      const targetCraft = selectedCraft.toLowerCase();
      const matchesCraftTag = craftTag.toLowerCase() === targetCraft;
      const matchesProductTag = a.products?.some((p) =>
        p.tags?.some((tag) => tag.toLowerCase().includes(targetCraft))
      );
      const matchesProductTitle = a.products?.some(
        (p) =>
          p.ai_title_en?.toLowerCase().includes(targetCraft) ||
          p.ai_title_local?.toLowerCase().includes(targetCraft)
      );

      if (!matchesCraftTag && !matchesProductTag && !matchesProductTitle) {
        return false;
      }
    }

    // Check search query
    if (q) {
      const matchesName = a.full_name && a.full_name.toLowerCase().includes(q);
      const matchesDistrict = a.district && a.district.toLowerCase().includes(q);
      const matchesCraft = craftTag.toLowerCase().includes(q);
      const matchesProducts = a.products?.some(
        (p) =>
          p.ai_title_en?.toLowerCase().includes(q) ||
          p.ai_title_local?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );

      return matchesName || matchesDistrict || matchesCraft || matchesProducts;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#F9F8F6] font-sans text-neutral-900 selection:bg-amber-100 selection:text-amber-900 relative w-full overflow-x-hidden">
      {/* ── Dynamic Ambient Background Canvas (Spans 100% of browser window, resizes dynamically) ── */}
      <DynamicWeaveCanvas />

      {/* ── Top Announcement Marquee ── */}
      <Marquee />

      {/* ── Global Sticky Navigation Header ── */}
      <header className="w-full sticky top-0 z-40 bg-[#F9F8F6]/90 backdrop-blur-md border-b border-stone-200/90 shadow-2xs">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20 py-3.5 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href="/shop"
              className="flex items-center gap-2.5 sm:gap-3 group min-w-0"
              title="Vernacular AI Home"
            >
              {/* Logo on the left side of Vernacular AI */}
              <div className="relative h-8 sm:h-9 w-auto aspect-[1423/874] shrink-0 flex items-center">
                <Image
                  src="/brand-hero.png"
                  alt="Vernacular AI Logo"
                  width={58}
                  height={36}
                  className="h-full w-auto object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
                  priority
                />
              </div>
              <span
                className={`text-lg sm:text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight truncate block ${playfair.className}`}
              >
                Vernacular AI
              </span>
            </Link>

            {/* Quick Anchor Navigation Links */}
            <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold text-neutral-600">
              <button onClick={scrollToDirectory} className="hover:text-neutral-900 transition">
                {t("nav_directory")}
              </button>
              <a href="#how-it-works" className="hover:text-neutral-900 transition">
                {t("nav_how_it_works")}
              </a>
              <a href="#why-us" className="hover:text-neutral-900 transition">
                {t("nav_why_us")}
              </a>
              <a href="#faq" className="hover:text-neutral-900 transition">
                {t("nav_faq")}
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageToggle />
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* ── 1. The Hero Section (Soft Warm Beige/Green Gradient, uses full canvas height and width) ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5F2EB] via-[#EFEBE4] to-[#FAF8F5] min-h-[72vh] lg:min-h-[80vh] flex flex-col justify-center py-16 md:py-24 2xl:py-32 px-4 sm:px-8 md:px-12 2xl:px-20 border-b border-stone-200/60 w-full">
        {/* Soft Ambient Radial Accents */}
        <div className="absolute top-0 left-1/4 w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-[#2E5A36]/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-[#C85A32]/5 rounded-full blur-3xl pointer-events-none translate-y-1/2"></div>

        <div className="w-full max-w-[1720px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-center">
          {/* Left Column: Headline, Subtitle, CTAs, and Stats */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-stone-200/80 shadow-2xs text-[#8B4513] text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles size={13} className="text-[#C85A32]" />
              <span>{t("hero_eyebrow")}</span>
            </div>

            {/* Headline */}
            <h1 className={`text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold text-neutral-900 mb-6 leading-[1.12] tracking-tight ${playfair.className}`}>
              {t("hero_headline_1")} <br />
              <span className="text-[#C85A32] italic font-serif">{t("hero_headline_2")}</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg md:text-xl text-neutral-600 font-light mb-8 max-w-2xl leading-relaxed">
              {t("hero_subheadline")}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full sm:w-auto mb-10">
              <button
                type="button"
                onClick={scrollToDirectory}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#C85A32] hover:bg-[#B34D27] text-white font-bold text-sm shadow-xl hover:shadow-2xl transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group"
              >
                <span>{t("hero_start_shopping")}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              {userRole === "customer" ? (
                <div
                  title="Artisan Studio is reserved for verified artisan accounts (Currently logged in as Patron / Buyer)"
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-stone-200/60 text-stone-400 border-2 border-stone-300/80 font-bold text-sm text-center cursor-not-allowed select-none opacity-60 flex items-center justify-center gap-2"
                >
                  <span>{t("hero_become_artisan")}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-300 text-stone-600">
                    Artisan Only
                  </span>
                </div>
              ) : (
                <Link
                  href="/studio"
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-transparent hover:bg-neutral-900/5 text-neutral-900 border-2 border-neutral-900 font-bold text-sm transition text-center"
                >
                  {t("hero_become_artisan")}
                </Link>
              )}
            </div>

            {/* Stats Row */}
            <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 px-6 py-3.5 rounded-full bg-white/80 backdrop-blur-md border border-stone-200/90 shadow-2xs text-xs sm:text-sm font-semibold text-neutral-700">
              <div className="flex items-center gap-1.5">
                <Users size={16} className="text-[#C85A32]" />
                <span><strong className="text-neutral-900">10K+</strong> {t("hero_stat_artisans")}</span>
              </div>
              <span className="text-stone-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5">
                <Package size={16} className="text-[#2E5A36]" />
                <span><strong className="text-neutral-900">50K+</strong> {t("hero_stat_products")}</span>
              </div>
              <span className="text-stone-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5">
                <Globe2 size={16} className="text-[#3B82F6]" />
                <span><strong className="text-neutral-900">120+</strong> {t("hero_stat_countries")}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Brand Art (Blends seamlessly into canvas, no hovering box, bigger scale) */}
          <div className="lg:col-span-5 flex items-center justify-center w-full relative">
            {/* Ambient soft glow directly beneath the art to merge with weave background */}
            <div className="absolute w-[90%] h-[90%] bg-gradient-to-tr from-[#C85A32]/10 via-transparent to-[#2E5A36]/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

            <div className="relative w-full max-w-[560px] lg:max-w-[640px] xl:max-w-[720px] flex items-center justify-center transition-transform duration-700 hover:scale-[1.02]">
              <Image
                src="/brand-hero.png"
                alt="Vernacular AI - Empowering Rural Weavers"
                width={850}
                height={522}
                className="w-full h-auto object-contain mix-blend-multiply select-none pointer-events-none"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Handpicked Artisanal Treasures (Horizontal Carousel) ── */}
      <TreasuresCarousel />

      {/* ── 3. How It Works (Two-Column Split Grid) ── */}
      <HowItWorks />

      {/* ── 4. Meet Our Talented Artisans (Integrated Functional Directory - Full Width Responsive Canvas) ── */}
      <section id="artisan-directory" className="py-20 md:py-28 w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-[#C85A32] uppercase tracking-widest text-xs font-bold mb-2 block">
            {t("directory_badge")}
          </span>
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 mb-4 ${playfair.className}`}>
            {t("directory_title")}
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base leading-relaxed">
            {t("directory_sub")}
          </p>

          {/* Integrated Search Bar with Native Voice Recognition */}
          <div className="w-full max-w-xl mx-auto mt-8 flex flex-col items-center">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-4 sm:left-5 flex items-center pointer-events-none text-neutral-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder={isListening ? t("voice_search_listening") : t("search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-11 sm:pl-12 pr-12 py-3.5 sm:py-4 bg-white border rounded-full text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-transparent shadow-sm transition-all text-sm font-medium ${
                  isListening
                    ? "border-red-400 ring-2 ring-red-300"
                    : "border-stone-200 focus:ring-stone-400"
                }`}
              />
              {/* Mic Voice Search Button */}
              <button
                type="button"
                onClick={handleVoiceSearch}
                title={isListening ? t("voice_search_listening") : t("voice_search_tooltip")}
                className={`absolute inset-y-0 right-2.5 my-auto h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/40"
                    : "text-neutral-400 hover:text-neutral-800 hover:bg-stone-100"
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>

            {/* Voice Search Hint */}
            {isListening && (
              <p className="text-xs font-semibold text-red-500 mt-2 animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {t("voice_search_listening")}
              </p>
            )}

            {/* Craft Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-full py-3 px-1 scrollbar-hide mt-3">
              {CRAFT_FILTERS.map((craft) => (
                <button
                  key={craft}
                  onClick={() => setSelectedCraft(craft)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-2xs ${
                    selectedCraft === craft
                      ? "bg-neutral-900 text-white shadow-neutral-900/20"
                      : "bg-white text-stone-600 border border-stone-200 hover:border-stone-400 hover:bg-stone-50"
                  }`}
                >
                  {craft === "All" ? t("filter_all") : t(`filter_${craft.toLowerCase()}`, craft)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Artisan Cards Grid */}
        {filteredArtisans.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 p-8 max-w-lg mx-auto">
            <p className="text-base font-semibold text-neutral-700">{t("no_artisans_found")}</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCraft("All");
              }}
              className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-full text-xs font-bold hover:bg-neutral-800 transition"
            >
              {t("reset_filters", "Reset Search & Filters")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6 sm:gap-8">
            {filteredArtisans.map((artisan) => {
              const crafts = ["Jamdani", "Taant", "Silk", "Khadi", "Baluchari"];
              const craftTag = crafts[artisan.id.charCodeAt(0) % crafts.length];
              const productCount = artisan.products ? artisan.products.length : 0;
              const latestProduct = artisan.products?.find((p) => Boolean(p.image_url));
              const coverImage = artisan.banner_url || latestProduct?.image_url;

              return (
                <Link
                  key={artisan.id}
                  href={`/shop/${artisan.id}`}
                  className="group block bg-white rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-between"
                >
                  <div>
                    {/* Top Half: Cover Banner */}
                    <div className="h-44 w-full relative overflow-hidden bg-stone-100">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={artisan.full_name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-300 opacity-60 group-hover:scale-105 transition-transform duration-700"></div>
                          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/woven-light.png')]"></div>
                        </>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10"></div>

                      {/* Creation Count Badge */}
                      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-white/95 backdrop-blur-sm text-neutral-800 text-[11px] font-bold rounded-full shadow-sm border border-stone-200/60 flex items-center gap-1.5">
                        {productCount > 0 ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{productCount} {productCount === 1 ? t("creation", "Creation") : t("creations_count")}</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>{t("new_weaver")}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom Details */}
                    <div className="relative px-6 pb-6 pt-12 text-center">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10">
                        <UniversalAvatar
                          user={artisan}
                          size="xl"
                          className="border-4 border-white shadow-md ring-0"
                        />
                      </div>

                      <h3 className={`text-xl font-bold text-neutral-900 mb-1 ${playfair.className}`}>
                        {artisan.full_name || "Artisan"}
                      </h3>

                      <div className="flex items-center justify-center gap-1.5 text-neutral-500 text-xs mb-3">
                        <MapPin size={13} className="opacity-70 text-[#C85A32]" />
                        <span>{artisan.district || "West Bengal, India"}</span>
                      </div>

                      <div className="inline-block px-3 py-0.5 bg-[#FAF8F5] border border-stone-200 text-stone-700 text-[11px] font-bold tracking-wider uppercase rounded-full">
                        {t(`filter_${craftTag.toLowerCase()}`, craftTag)}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer action bar */}
                  <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#C85A32]">
                    <span>{t("explore_weaver_storefront", "Explore Weaver Storefront")}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 5. Trust & Support Sections ── */}
      <TrustSections />

      {/* ── 6. FAQ Accordion Section ── */}
      <LandingFaq />

      {/* ── 7. Footer Integration (Newsletter, Global CTA Banner, 4-Col Links) ── */}
      <LandingFooter />
    </div>
  );
}
