"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MapPin, ArrowRight, User } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useArtisan } from "@/context/ArtisanContext";
import { useRouter } from "next/navigation";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

interface Artisan {
  id: string;
  phone_number: string;
  full_name: string;
  district: string;
  created_at: string;
}

interface Props {
  artisans: Artisan[];
}

export default function ShopDirectoryClient({ artisans }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const { artisanId, profileName, userRole, logout } = useArtisan();
  const router = useRouter();

  const filteredArtisans = artisans.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      (a.full_name && a.full_name.toLowerCase().includes(q)) ||
      (a.district && a.district.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#F9F8F6] font-sans">
      {/* ── Global Header ── */}
      <header className="px-5 md:px-8 pt-6 pb-4 flex items-center justify-between sticky top-0 z-20 bg-[#F9F8F6]/80 backdrop-blur-md border-b border-stone-200">
        <div className="flex-1 min-w-0">
          <Link href="/" className={`text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight ${playfair.className}`}>
            Vernacular AI
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {artisanId ? (
            <div className="flex items-center gap-3">
              {userRole === "artisan" && (
                <Link href="/studio" className="px-4 py-2 bg-neutral-900 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 transition">
                  Go to Studio
                </Link>
              )}
              <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-neutral-800 font-bold font-serif shadow-sm">
                {profileName ? profileName.charAt(0).toUpperCase() : <User size={16} />}
              </div>
              <button onClick={logout} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">Logout</button>
            </div>
          ) : (
            <Link href="/login" className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition shadow-md">
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* ── Editorial Hero Section ── */}
      <section className="px-4 py-16 md:py-24 text-center max-w-4xl mx-auto flex flex-col items-center">
        <span className="text-amber-700 uppercase tracking-widest text-xs font-semibold mb-4 block">
          Artisan Directory
        </span>
        <h1 className={`text-4xl md:text-5xl lg:text-6xl text-neutral-900 mb-6 leading-tight ${playfair.className}`}>
          Discover Authentic Handlooms
        </h1>
        <p className="text-neutral-500 text-lg md:text-xl font-light mb-10 max-w-2xl">
          Shop zero-commission, directly from rural weavers and artisans.
        </p>

        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-neutral-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by name or region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-full text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent shadow-sm transition-all text-sm font-medium"
          />
        </div>
      </section>

      {/* ── Artisan Grid Layout ── */}
      <section className="max-w-7xl mx-auto px-4 pb-24">
        {filteredArtisans.length === 0 ? (
          <div className="text-center py-20 text-neutral-400">
            <p>No artisans found matching &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArtisans.map((artisan, index) => {
              // Assign a pseudo-random craft tag based on ID for demo purposes
              const crafts = ["Jamdani", "Taant", "Silk", "Khadi", "Baluchari"];
              const craftTag = crafts[artisan.id.charCodeAt(0) % crafts.length];
              
              const initial = artisan.full_name ? artisan.full_name.charAt(0).toUpperCase() : "A";

              return (
                <Link
                  key={artisan.id}
                  href={`/shop/${artisan.id}`}
                  className="group block bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Top Half: Visual Cover */}
                  <div className="h-40 w-full relative overflow-hidden bg-stone-100">
                    {/* Placeholder Texture / Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-300 opacity-60 group-hover:scale-105 transition-transform duration-700"></div>
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/woven-light.png')]"></div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
                  </div>

                  {/* Bottom Half: Details */}
                  <div className="relative px-6 pb-6 pt-10 text-center">
                    {/* Avatar */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-neutral-900 border-4 border-white rounded-full flex items-center justify-center text-white text-2xl shadow-sm z-10">
                      <span className={`${playfair.className}`}>{initial}</span>
                    </div>

                    <h2 className={`text-2xl text-neutral-900 mb-1 ${playfair.className}`}>
                      {artisan.full_name || "Demo Artisan"}
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
