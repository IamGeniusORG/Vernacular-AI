/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { ShoppingBag, MessageCircle, BadgeCheck } from "lucide-react";
import { Product, Artisan } from "@/lib/api";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

interface Props {
  products: Product[];
  artisan: Artisan;
}

export default function StorefrontClient({ products, artisan }: Props) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleBuy = (product: Product) => {
    const storeUrl = `${window.location.origin}/shop/${artisan.id}`;
    const priceText = product.price_inr ? ` - ₹${product.price_inr}` : "";
    const text = `Hello ${artisan.full_name}, I would like to buy this saree: ${product.ai_title_en}${priceText}. Here is the link: ${storeUrl}`;
    
    // Sanitize phone number (strip non-digits)
    const phone = artisan.phone_number.replace(/\D/g, '');
    
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    showToast("Opening WhatsApp...");
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!products.length) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-neutral-400 shadow-sm">
          <ShoppingBag size={36} strokeWidth={1.5} />
        </div>
        <h1 className={`text-2xl text-neutral-800 ${playfair.className}`}>No products yet</h1>
        <p className="text-neutral-500 text-sm max-w-xs font-sans">
          This artisan hasn&apos;t listed any products. Check back soon!
        </p>
      </div>
    );
  }

  const hero = products[0];
  // Since the hero is now just an editorial showcase without a buy button,
  // we leave all products in the purchasing grid so the user can actually buy the hero item.
  const gridProducts = products; 

  // ── Full storefront ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F9F8F6] font-sans text-neutral-800">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-[#F9F8F6]/80 backdrop-blur-md border-b border-stone-200 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className={`text-xl md:text-2xl text-neutral-900 ${playfair.className}`}>
            {artisan.full_name}&apos;s Loom
          </h1>
          <BadgeCheck size={20} className="text-amber-700 mt-1" />
        </div>
        <div className="hidden md:flex text-xs text-neutral-500 uppercase tracking-widest font-semibold items-center gap-1.5">
          Verified Artisan
        </div>
      </header>

      {/* ── Featured Product (Hero - Editorial) ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column (Image) */}
          <div className="lg:col-span-7 h-[450px] md:h-[600px] w-full rounded-2xl overflow-hidden shadow-lg border border-stone-200 bg-white">
            <img
              src={hero.image_url}
              alt={hero.ai_title_en}
              className="w-full h-full object-cover object-top"
            />
          </div>
          
          {/* Right Column (Details) */}
          <div className="lg:col-span-5 flex flex-col space-y-6 lg:pl-6">
            <div>
              <span className="block tracking-widest text-xs font-semibold text-amber-700 uppercase mb-4">
                ✦ Masterpiece Showcase
              </span>
              <h2 className={`text-neutral-900 text-4xl md:text-5xl leading-[1.2] ${playfair.className}`}>
                {hero.ai_title_local}
              </h2>
            </div>
            
            <div className="h-px w-16 bg-stone-300"></div>
            
            <p className="text-neutral-600 text-base md:text-lg leading-relaxed font-light">
              {hero.ai_desc_en}
            </p>
            
            {/* Deliberately omitted "Buy on WhatsApp" button per editorial requirements */}
          </div>
        </div>
      </section>

      {/* ── Boutique Catalog Grid ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        
        {/* Section Divider & Heading */}
        <div className="flex items-center gap-6 mb-12">
          <h3 className={`text-2xl md:text-3xl text-neutral-800 ${playfair.className} whitespace-nowrap`}>
            Explore the Collection
          </h3>
          <div className="flex-1 h-px bg-stone-300"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
          {gridProducts.map((product) => (
            <div
              key={product.id}
              className="group flex flex-col bg-transparent"
            >
              {/* Image Container */}
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-white border border-stone-200 mb-4">
                <img
                  src={product.image_url}
                  alt={product.ai_title_en}
                  className="w-full h-full object-cover object-top transition-transform duration-500 ease-in-out group-hover:scale-105"
                />
                {product.price_inr && (
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-neutral-900 text-sm font-semibold px-3 py-1 rounded-full shadow-sm">
                    ₹{product.price_inr}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col flex-grow space-y-3 px-1">
                <div className="flex-grow">
                  <h4 className={`text-neutral-900 text-lg mb-1 leading-tight ${playfair.className}`}>
                    {product.ai_title_local}
                  </h4>
                  <p className="text-neutral-500 text-sm font-light leading-snug line-clamp-2">
                    {product.ai_title_en}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 py-1">
                  {product.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-2.5 py-0.5 border border-stone-200 text-neutral-500 text-xs font-medium rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleBuy(product)}
                  className="w-full mt-2 py-3 bg-neutral-900 text-white rounded-lg text-sm font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
                >
                  <MessageCircle size={16} className="opacity-90" /> Buy on WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="text-center py-16 px-4 border-t border-stone-200 mt-12">
        <p className={`text-xl text-neutral-800 mb-4 ${playfair.className}`}>
          {artisan.full_name}&apos;s Loom
        </p>
        <p className="text-sm text-neutral-400 font-light font-sans">
          Powered by <span className="text-neutral-600 font-medium">Vernacular AI</span>
        </p>
      </footer>

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <MessageCircle size={16} className="text-white/80 shrink-0" /> {toastMsg}
        </div>
      )}
    </div>
  );
}
