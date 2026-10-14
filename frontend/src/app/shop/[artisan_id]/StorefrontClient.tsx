/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { ShoppingBag, MessageCircle, BadgeCheck, Camera, Zap, X, Copy, Check } from "lucide-react";
import { Product, Artisan } from "@/lib/api";
import { useArtisan } from "@/context/ArtisanContext";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { QRCodeCanvas } from "qrcode.react";

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
  const [activeUpiProduct, setActiveUpiProduct] = useState<Product | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const { artisanId } = useArtisan();
  const { t } = useLanguage();
  const isOwner = artisanId === artisan.id;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleBuy = (product: Product) => {
    const rawPhone = artisan.whatsapp_number || artisan.phone_number || "";
    const digits = rawPhone.replace(/\D/g, "");
    
    if (!digits) {
      showToast("Artisan has not set a WhatsApp number yet.");
      return;
    }
    
    // Ensure country code 91 if 10 digits
    const cleanPhone = digits.length === 10 ? `91${digits}` : digits;
    const price = product.price || product.price_inr || 1500;
    const productTitle = product.ai_title_en || product.ai_title_local || "Handloom Creation";
    const text = `Namaste ${artisan.full_name}, I would like to purchase "${productTitle}" listed at ₹${price} on your Artisan Storefront: ${typeof window !== "undefined" ? window.location.href : ""}`;
    
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    showToast("Opening WhatsApp...");
  };

  const handleCopyUpi = (upiId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      showToast("UPI ID copied to clipboard!");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!products.length) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-neutral-400 shadow-sm">
          <ShoppingBag size={36} strokeWidth={1.5} />
        </div>
        <h1 className={`text-2xl text-neutral-800 ${playfair.className}`}>No products yet</h1>
        <p className="text-neutral-500 text-sm max-w-xs font-sans mb-4">
          This artisan hasn&apos;t listed any products. Check back soon!
        </p>
        {isOwner && (
          <Link href="/studio" className="px-6 py-3 bg-neutral-900 text-white rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-neutral-800 transition shadow-md">
            <Camera size={18} /> Generate First Catalog
          </Link>
        )}
      </div>
    );
  }

  const hero = products[0];
  const gridProducts = products;

  // Active product UPI Details
  const upiId = artisan.upi_id || "demoartisan@upi";
  const upiPrice = activeUpiProduct ? (activeUpiProduct.price || activeUpiProduct.price_inr || 1500) : 1500;
  const upiTitle = activeUpiProduct ? (activeUpiProduct.ai_title_en || activeUpiProduct.ai_title_local || "Handloom Creation") : "Handloom Creation";
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(artisan.full_name)}&am=${upiPrice}&cu=INR&tn=${encodeURIComponent(upiTitle)}`;

  return (
    <div className="min-h-screen bg-[#F9F8F6] font-sans text-neutral-800">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-[#F9F8F6]/80 backdrop-blur-md border-b border-stone-200 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          <Link 
            href="/shop" 
            className="flex items-center justify-center py-3 px-2 -ml-2 text-neutral-600 hover:text-neutral-900 active:bg-stone-200/50 rounded-full transition shrink-0 touch-manipulation" 
            title="Back to Directory"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <h1 className={`text-lg sm:text-xl md:text-2xl text-neutral-900 truncate ${playfair.className}`}>
              {artisan.full_name}&apos;s Loom
            </h1>
            <BadgeCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex text-xs text-neutral-500 uppercase tracking-widest font-semibold items-center gap-1.5">
            Verified Artisan
          </div>
          {isOwner && (
            <Link href="/studio" className="px-4 py-2 bg-neutral-900 text-white rounded-full text-xs font-semibold flex items-center gap-2 hover:bg-neutral-800 transition">
              <Camera size={14} /> Studio
            </Link>
          )}
        </div>
      </header>

      {/* ── Featured Product (Hero - Editorial) ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column (Image) */}
          <div className="lg:col-span-7 h-[450px] md:h-[600px] w-full rounded-2xl overflow-hidden shadow-lg border border-stone-200 bg-white relative">
            <img
              src={hero.image_url}
              alt={hero.ai_title_en}
              className="w-full h-full object-cover object-top"
            />
            {hero.in_stock === false && (
              <div className="absolute top-4 right-4 bg-neutral-900/85 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow">
                {t('sold_out')}
              </div>
            )}
          </div>
          
          {/* Right Column (Details) */}
          <div className="lg:col-span-5 flex flex-col space-y-6 lg:pl-6">
            <div>
              <span className="block tracking-widest text-xs font-semibold text-amber-700 uppercase mb-4">
                ✦ Masterpiece Showcase
              </span>
              <h2 className={`text-neutral-900 text-3xl sm:text-4xl md:text-5xl leading-normal md:leading-relaxed ${playfair.className}`}>
                {hero.ai_title_local}
              </h2>
            </div>
            
            <div className="h-px w-16 bg-stone-300"></div>
            
            <p className="text-neutral-600 text-base md:text-lg leading-relaxed font-light">
              {hero.ai_desc_en}
            </p>
            
            {hero.audio_url && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <span className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                  Voice of the Weaver
                </span>
                <audio 
                  controls 
                  src={hero.audio_url} 
                  className="w-full max-w-sm h-10 rounded-full bg-stone-100 [&::-webkit-media-controls-panel]:bg-stone-100 [&::-webkit-media-controls-play-button]:bg-stone-200"
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
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
          {gridProducts.map((product) => {
            const displayPrice = product.price || product.price_inr;
            const isSoldOut = product.in_stock === false;

            return (
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
                  {displayPrice && (
                    <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-neutral-900 text-sm font-semibold px-3 py-1 rounded-full shadow-sm">
                      ₹{displayPrice}
                    </div>
                  )}
                  {isSoldOut && (
                    <div className="absolute top-3 right-3 bg-neutral-900/85 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">
                      {t('sold_out')}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-col flex-grow space-y-3 px-1">
                  <div className="flex-grow">
                    <h4 className={`text-neutral-900 text-base sm:text-lg mb-1 leading-normal sm:leading-relaxed ${playfair.className}`}>
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

                  {product.audio_url && (
                    <div className="mt-2 w-full">
                      <audio 
                        controls 
                        src={product.audio_url} 
                        className="w-full h-8 rounded-full bg-stone-50 [&::-webkit-media-controls-panel]:bg-stone-50"
                      >
                      </audio>
                    </div>
                  )}

                  {/* Actions */}
                  {isSoldOut ? (
                    <button
                      disabled
                      className="w-full mt-2 py-3 bg-stone-200 text-stone-400 rounded-lg text-sm font-semibold cursor-not-allowed uppercase tracking-wider"
                    >
                      {t('sold_out')}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2">
                      {/* WhatsApp Checkout */}
                      <button
                        onClick={() => handleBuy(product)}
                        className="w-full py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors shadow-sm active:scale-[0.99]"
                      >
                        <MessageCircle size={16} className="opacity-90" /> Buy on WhatsApp
                      </button>

                      {/* Instant UPI Pay Modal Trigger */}
                      <button
                        onClick={() => setActiveUpiProduct(product)}
                        className="w-full py-2.5 bg-amber-50 text-amber-950 border border-amber-300/80 rounded-lg text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 hover:bg-amber-100/90 transition-colors shadow-sm active:scale-[0.99]"
                      >
                        <Zap size={14} className="text-amber-600 fill-amber-500 shrink-0" />
                        {t('instant_upi_pay')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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

      {/* ── Zero-Commission UPI Checkout Modal ── */}
      {activeUpiProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 flex flex-col items-center animate-in zoom-in-95 duration-200 relative">
            
            {/* Close Button */}
            <button
              onClick={() => setActiveUpiProduct(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition"
            >
              <X size={20} />
            </button>

            {/* Zero Commission Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold tracking-wide uppercase mb-4 text-center">
              <Zap size={12} className="text-emerald-600 fill-emerald-500 shrink-0" />
              <span>{t('zero_commission_badge')}</span>
            </div>

            {/* Price & Title */}
            <div className="text-center mb-4">
              <div className="text-3xl font-extrabold text-neutral-900 mb-1">
                ₹{upiPrice}
              </div>
              <h3 className={`text-base text-neutral-800 font-medium line-clamp-1 ${playfair.className}`}>
                {upiTitle}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">Direct payment to {artisan.full_name}</p>
            </div>

            {/* QR Code Canvas */}
            <div className="p-3 bg-white border border-stone-200 rounded-2xl shadow-inner mb-4">
              <QRCodeCanvas
                value={upiUri}
                size={180}
                bgColor={"#ffffff"}
                fgColor={"#171717"}
                level={"M"}
              />
            </div>

            {/* UPI ID Display & Copy */}
            <div className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between mb-4">
              <div className="min-w-0 pr-2">
                <span className="block text-[10px] text-stone-400 uppercase font-bold tracking-wider">Artisan UPI ID</span>
                <span className="text-xs font-semibold text-stone-800 truncate block font-mono">{upiId}</span>
              </div>
              <button
                onClick={() => handleCopyUpi(upiId)}
                className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition shrink-0"
                title="Copy UPI ID"
              >
                {copiedUpi ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>

            {/* Pay via UPI App Deep-link Button */}
            <a
              href={upiUri}
              className="w-full py-3 bg-neutral-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition active:scale-[0.99] shadow-md text-center"
            >
              <Zap size={16} className="text-amber-400 fill-amber-400 shrink-0" />
              {t('pay_via_upi_app')}
            </a>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <MessageCircle size={16} className="text-white/80 shrink-0" /> {toastMsg}
        </div>
      )}
    </div>
  );
}
