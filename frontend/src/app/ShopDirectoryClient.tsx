/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MapPin, User, Sparkles, Mic, MicOff } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useArtisan } from "@/context/ArtisanContext";
import { useLanguage } from "@/context/LanguageContext";
import { Artisan } from "@/lib/api";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const CRAFT_FILTERS = ["All", "Baluchari", "Taant", "Jamdani", "Khadi", "Silk"];

interface Props {
  artisans: Artisan[];
}

export default function ShopDirectoryClient({ artisans }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCraft, setSelectedCraft] = useState("All");
  const [isListening, setIsListening] = useState(false);
  const { artisanId, profileName, userRole, logout } = useArtisan();
  const { activeLanguage, t } = useLanguage();

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
    <div className="min-h-screen bg-[#F9F8F6] font-sans">
      {/* ── Global Header ── */}
      <header className="px-4 md:px-8 py-3.5 md:py-5 flex items-center justify-between gap-3 sticky top-0 z-20 bg-[#F9F8F6]/90 backdrop-blur-md border-b border-stone-200">
        <div className="flex-1 min-w-0">
          <Link href="/shop" className={`text-lg sm:text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight truncate block ${playfair.className}`}>
            Vernacular AI
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {artisanId ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {userRole === "artisan" && (
                <Link
                  href="/studio"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-neutral-900 text-white rounded-full text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles size={13} className="shrink-0 text-amber-300" />
                  <span>Studio</span>
                </Link>
              )}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-200 flex items-center justify-center text-neutral-800 font-bold font-serif shadow-sm text-xs sm:text-sm shrink-0">
                {profileName ? profileName.charAt(0).toUpperCase() : <User size={14} />}
              </div>
              <button onClick={logout} className="text-xs sm:text-sm font-medium text-neutral-500 hover:text-neutral-900">Logout</button>
            </div>
          ) : (
            <Link href="/login" className="px-3.5 py-1.5 sm:px-5 sm:py-2 bg-indigo-600 text-white rounded-full text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition shadow-md shrink-0">
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* ── Editorial Hero Section ── */}
      <section className="px-4 md:px-8 py-12 md:py-20 text-center max-w-4xl mx-auto flex flex-col items-center">
        <span className="text-amber-700 uppercase tracking-widest text-xs font-semibold mb-3 block">
          Artisan Directory
        </span>
        <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-neutral-900 mb-4 sm:mb-6 leading-tight ${playfair.className}`}>
          Discover Authentic Handlooms
        </h1>
        <p className="text-neutral-500 text-base sm:text-lg md:text-xl font-light mb-8 max-w-2xl px-2">
          Shop zero-commission, directly from rural weavers and artisans.
        </p>

        {/* Search Bar with Native Voice Recognition */}
        <div className="w-full max-w-lg px-1 sm:px-0 flex flex-col items-center">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-4 sm:left-5 flex items-center pointer-events-none text-neutral-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder={isListening ? t('voice_search_listening') : "Search by artisan, region, or craft..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-11 sm:pl-12 pr-12 py-3.5 sm:py-4 bg-white border rounded-full text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-transparent shadow-sm transition-all text-sm font-medium ${
                isListening
                  ? "border-red-400 ring-2 ring-red-300"
                  : "border-stone-200 focus:ring-stone-400"
              }`}
            />
            {/* Mic Button */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              title={isListening ? t('voice_search_listening') : t('voice_search_tooltip')}
              className={`absolute inset-y-0 right-2.5 my-auto h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/40"
                  : "text-neutral-400 hover:text-neutral-800 hover:bg-stone-100"
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>

          {/* Voice Search Hint when active */}
          {isListening && (
            <p className="text-xs font-semibold text-red-500 mt-2 animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {t('voice_search_listening')}
            </p>
          )}

          {/* Craft Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full py-3 px-1 scrollbar-hide mt-3">
            {CRAFT_FILTERS.map((craft) => (
              <button
                key={craft}
                onClick={() => setSelectedCraft(craft)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
                  selectedCraft === craft
                    ? "bg-neutral-900 text-white shadow-neutral-900/20"
                    : "bg-white text-stone-600 border border-stone-200 hover:border-stone-400 hover:bg-stone-50"
                }`}
              >
                {craft}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Artisan Grid Layout ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-24">
        {filteredArtisans.length === 0 ? (
          <div className="text-center py-20 text-neutral-400">
            <p className="text-base font-medium">No artisans found matching your search</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCraft("All");
              }}
              className="mt-3 text-xs font-bold text-neutral-800 underline hover:text-neutral-600"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
            {filteredArtisans.map((artisan) => {
              // Craft tag
              const crafts = ["Jamdani", "Taant", "Silk", "Khadi", "Baluchari"];
              const craftTag = crafts[artisan.id.charCodeAt(0) % crafts.length];
              
              const initial = artisan.full_name ? artisan.full_name.charAt(0).toUpperCase() : "A";
              
              // Dynamic cover image & creation count
              const productCount = artisan.products ? artisan.products.length : 0;
              const latestProduct = artisan.products?.find((p) => Boolean(p.image_url));
              const coverImage = latestProduct?.image_url;

              return (
                <Link
                  key={artisan.id}
                  href={`/shop/${artisan.id}`}
                  className="group block bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative"
                >
                  {/* Top Half: Dynamic Visual Cover Banner */}
                  <div className="h-44 w-full relative overflow-hidden bg-stone-100">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={artisan.full_name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-300 opacity-60 group-hover:scale-105 transition-transform duration-700"></div>
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/woven-light.png')]"></div>
                      </>
                    )}
                    
                    {/* Dark gradient for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10"></div>

                    {/* Creation Count Pill Badge */}
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-white/95 backdrop-blur-sm text-neutral-800 text-[11px] font-bold rounded-full shadow-sm border border-stone-200/60 flex items-center gap-1.5">
                      {productCount > 0 ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{productCount} {productCount === 1 ? "Creation" : t('creations_count')}</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span>{t('new_weaver')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom Half: Details */}
                  <div className="relative px-6 pb-6 pt-10 text-center">
                    {/* Avatar */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-neutral-900 border-4 border-white rounded-full flex items-center justify-center text-white text-2xl shadow-sm z-10">
                      <span className={`${playfair.className}`}>{initial}</span>
                    </div>

                    <h2 className={`text-2xl text-neutral-900 mb-1 ${playfair.className}`}>
                      {artisan.full_name || "Artisan"}
                    </h2>

                    <div className="flex items-center justify-center gap-1.5 text-neutral-500 text-sm mb-4">
                      <MapPin size={14} className="opacity-70" />
                      {artisan.district || "West Bengal, India"}
                    </div>

                    {/* Craft Tag */}
                    <div className="inline-block px-3 py-1 bg-stone-100 text-stone-600 text-xs font-semibold tracking-wider uppercase rounded-full mb-2">
                      {craftTag}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
