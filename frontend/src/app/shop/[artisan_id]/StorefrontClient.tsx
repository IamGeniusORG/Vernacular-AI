/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, MessageCircle, BadgeCheck, Camera, Zap, X, Copy, Check, ArrowLeft, Volume2, Globe } from "lucide-react";
import { Product, Artisan } from "@/lib/api";
import { useArtisan } from "@/context/ArtisanContext";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { QRCodeCanvas } from "qrcode.react";
import Marquee from "@/components/Marquee";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import ArtisanAvatar from "@/components/ArtisanAvatar";

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
  const [shuffledProducts, setShuffledProducts] = useState<Product[]>(products);
  const [activeIndex, setActiveIndex] = useState(0);
  const [destination, setDestination] = useState<"domestic" | "international">("domestic");
  const [paypalSuccessOrder, setPaypalSuccessOrder] = useState<{
    orderId: string;
    productTitle: string;
    amount: string;
  } | null>(null);
  const { artisanId } = useArtisan();
  const { t } = useLanguage();
  const isOwner = artisanId === artisan.id;

  const getProductUsdPrice = (p: Product): number => {
    if (p.price_usd && p.price_usd > 0) return Number(p.price_usd);
    if (p.suggested_usd_price && p.suggested_usd_price > 0) return Number(p.suggested_usd_price);
    const inr = p.price || p.price_inr || 1500;
    return Math.round(Math.max(25, inr / 75));
  };

  const rawClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();
  const paypalClientId = rawClientId && !rawClientId.startsWith("BAA") ? rawClientId : "test";

  // Shuffle products randomly for the Masterpiece Showcase carousel
  useEffect(() => {
    if (products && products.length > 0) {
      const shuffled = [...products].sort(() => 0.5 - Math.random());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShuffledProducts(shuffled);
      setActiveIndex(0);
    }
  }, [products]);

  // Auto-slide carousel every 3000ms (1s transition + 2s rest)
  useEffect(() => {
    if (shuffledProducts.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev >= shuffledProducts.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [shuffledProducts.length]);

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

  const gridProducts = products;

  // Active product UPI Details
  const upiId = artisan.upi_id || "demoartisan@upi";
  const upiPrice = activeUpiProduct ? (activeUpiProduct.price || activeUpiProduct.price_inr || 1500) : 1500;
  const upiTitle = activeUpiProduct ? (activeUpiProduct.ai_title_en || activeUpiProduct.ai_title_local || "Handloom Creation") : "Handloom Creation";
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(artisan.full_name)}&am=${upiPrice}&cu=INR&tn=${encodeURIComponent(upiTitle)}`;

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        currency: "USD",
        components: "buttons",
      }}
      deferLoading={destination !== "international"}
    >
      <div className="min-h-screen bg-[#F9F8F6] font-sans text-neutral-800">

        {/* ── Marquee Announcement Bar ── */}
        <Marquee />

        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-50 bg-[#F9F8F6]/90 backdrop-blur-md border-b border-stone-200 px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link 
              href="/shop" 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-stone-100 active:bg-stone-200 text-neutral-800 rounded-full text-xs sm:text-sm font-semibold transition border border-stone-200/90 shadow-sm shrink-0 group"
              title="Back to Directory"
            >
              <ArrowLeft size={16} className="text-neutral-500 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">← Back to Directory</span>
              <span className="inline sm:hidden">Marketplace</span>
            </Link>
            <div className="h-5 w-px bg-stone-300 hidden sm:block shrink-0"></div>
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <ArtisanAvatar name={artisan.full_name} avatarUrl={artisan.avatar_url} size="sm" showBorder />
              <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                <h1 className={`text-base sm:text-lg md:text-xl text-neutral-900 truncate ${playfair.className}`}>
                  {artisan.full_name}&apos;s Loom
                </h1>
                <BadgeCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
              </div>
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

        {/* ── Breadcrumb Navigation ── */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-0">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-amber-800 transition group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform text-neutral-400 group-hover:text-amber-800" />
            <span>Explore Marketplace</span>
            <span className="text-stone-300">/</span>
            <span className="text-neutral-800 font-bold">{artisan.full_name}</span>
          </Link>
        </div>

        {/* ── Artisan Profile Banner Header ── */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-2">
          <div className="relative rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm bg-white">
            {/* Banner Background */}
            <div className="h-36 sm:h-48 md:h-56 w-full relative bg-stone-100 overflow-hidden">
              {artisan.banner_url || products[0]?.image_url ? (
                <img
                  src={artisan.banner_url || products[0]?.image_url}
                  alt={`${artisan.full_name} banner`}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-stone-200 via-stone-300 to-stone-200 opacity-70"></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            </div>

            {/* Profile Bar below banner */}
            <div className="px-5 sm:px-8 pb-5 pt-3 sm:pt-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 relative">
              <div className="flex items-end gap-3 sm:gap-4 -mt-14 sm:-mt-16 z-10">
                <ArtisanAvatar
                  name={artisan.full_name}
                  avatarUrl={artisan.avatar_url}
                  size="xl"
                  className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white shadow-lg ring-0"
                />
                <div className="pb-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 ${playfair.className}`}>
                      {artisan.full_name}
                    </h2>
                    <BadgeCheck size={20} className="text-amber-600 shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-500 font-medium">
                    {artisan.district || "West Bengal, India"} • {products.length} {products.length === 1 ? "Creation" : "Creations"}
                  </p>
                </div>
              </div>

              {isOwner && (
                <Link
                  href="/studio"
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-neutral-800 rounded-full text-xs font-semibold flex items-center gap-1.5 transition border border-stone-200 shadow-sm"
                >
                  <Camera size={13} />
                  <span>Customize Profile & Branding</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Shipping Destination & Global Export Toggle ── */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-white border border-stone-200/90 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 shrink-0">
                <Globe size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">
                  Shipping Destination
                </span>
                <p className="text-[11px] text-neutral-400">
                  {destination === "domestic"
                    ? "Standard domestic shipping within India (UPI & WhatsApp Checkout)"
                    : "Worldwide insured boutique export (PayPal Sandbox Checkout in USD)"}
                </p>
              </div>
            </div>

            <div className="inline-flex bg-stone-100 p-1 rounded-xl shadow-inner border border-stone-200/80 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setDestination("domestic")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  destination === "domestic"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <span>🇮🇳</span>
                <span>Domestic (INR)</span>
              </button>
              <button
                type="button"
                onClick={() => setDestination("international")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  destination === "international"
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <span>🌍</span>
                <span>International (USD)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Featured Product (Automated Randomized Carousel - Masterpiece Showcase) ── */}
        <section className="w-full py-4">
          {/* 1. Outer Wrapper: Hides the overflow */}
          <div className="relative w-full overflow-hidden py-6">
            
            {/* 2. The Sliding Track: Moves the whole row of slides */}
            <div 
              className="flex transition-transform duration-1000 ease-in-out" 
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {shuffledProducts.map((product) => {
                const slideAudio = product.audio_url || products.find((p) => p.audio_url)?.audio_url;
                const productTitle = product.ai_title_local || product.ai_title_en || "Handcrafted Heritage";
                const productDesc = product.ai_desc_en || product.ai_desc_local || "";
                const usdPrice = getProductUsdPrice(product);
                const inrPrice = product.price || product.price_inr || 1500;

                return (
                  /* 3. The Individual Slide: MUST strictly be 100% of the viewport/container width */
                  <div key={product.id} className="w-full min-w-full flex-shrink-0 px-4 md:px-8">
                    
                    {/* 4. Inner Grid: Safely places Image on left, Text on right */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
                      
                      {/* Left Side: Locked Aspect Ratio Image */}
                      <div className="relative w-full aspect-[4/5] md:aspect-[3/4] rounded-2xl overflow-hidden bg-stone-100 shadow-md">
                        <img 
                          src={product.image_url || '/placeholder.jpg'} 
                          alt={productTitle}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {product.in_stock === false && (
                          <div className="absolute top-4 right-4 bg-neutral-900/85 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow z-10">
                            {t('sold_out')}
                          </div>
                        )}
                      </div>

                      {/* Right Side: Text & Audio */}
                      <div className="flex flex-col space-y-6">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold tracking-widest text-amber-700 uppercase">
                              ✦ Masterpiece Showcase
                            </p>
                            {destination === "international" && (
                              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                                Global Export Mode
                              </span>
                            )}
                          </div>
                          <h2 className={`text-4xl md:text-5xl font-serif text-stone-900 leading-tight ${playfair.className}`}>
                            {productTitle}
                          </h2>
                          <div className="mt-3 flex items-baseline gap-2.5">
                            {destination === "international" ? (
                              <>
                                <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                                  ${usdPrice.toFixed(2)} USD
                                </span>
                                <span className="text-xs text-stone-500 font-light">Worldwide Express Insured Delivery</span>
                              </>
                            ) : (
                              <>
                                <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                                  ₹{inrPrice}
                                </span>
                                <span className="text-xs text-stone-500 font-light">Direct to Weaver</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-stone-600 leading-relaxed font-light">
                          {destination === "international" && product.export_description ? product.export_description : productDesc}
                        </p>

                        {/* Audio Player */}
                        {slideAudio && (
                          <div className="pt-4 border-t border-stone-200">
                            <p className="text-xs font-bold tracking-widest text-stone-500 uppercase mb-2 flex items-center gap-2">
                              <Volume2 className="w-4 h-4 text-amber-700"/> Voice of the Weaver
                            </p>
                            <audio 
                              controls 
                              preload="metadata"
                              src={slideAudio} 
                              className="w-full max-w-sm h-10 rounded-full bg-stone-100 [&::-webkit-media-controls-panel]:bg-stone-100 [&::-webkit-media-controls-play-button]:bg-stone-200"
                            >
                              <source src={slideAudio} type="audio/webm" />
                              <source src={slideAudio} type="audio/mp4" />
                              <source src={slideAudio} type="audio/mpeg" />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          {/* Slide Indicator Dots */}
          {shuffledProducts.length > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              {shuffledProducts.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeIndex === idx 
                      ? "w-8 bg-amber-700" 
                      : "w-2 bg-stone-300 hover:bg-stone-400"
                  }`}
                />
              ))}
            </div>
          )}
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
            const usdPrice = getProductUsdPrice(product);
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
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm text-neutral-900 text-sm font-semibold px-3 py-1 rounded-full shadow-sm">
                    {destination === "international" ? `$${usdPrice.toFixed(2)} USD` : `₹${displayPrice || 1500}`}
                  </div>
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
                      {destination === "international" && product.export_description
                        ? product.export_description
                        : product.ai_title_en}
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
                    <div className="mt-2 w-full pt-1">
                      <span className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Volume2 size={12} className="text-amber-600" />
                        Voice of the Weaver
                      </span>
                      <audio 
                        controls 
                        preload="metadata"
                        src={product.audio_url} 
                        className="w-full h-8 rounded-full bg-stone-50 [&::-webkit-media-controls-panel]:bg-stone-50"
                      >
                        <source src={product.audio_url} type="audio/webm" />
                        <source src={product.audio_url} type="audio/mp4" />
                        <source src={product.audio_url} type="audio/mpeg" />
                        Your browser does not support audio.
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
                  ) : destination === "international" ? (
                    <div className="flex flex-col gap-2 mt-2 w-full">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                          <Globe size={12} className="text-emerald-600" /> Insured Export
                        </span>
                        <span className="text-xs font-bold text-stone-900">${usdPrice.toFixed(2)} USD</span>
                      </div>
                      <div className="w-full relative z-10">
                        <PayPalButtons
                          style={{
                            layout: "vertical",
                            height: 38,
                            shape: "rect",
                            color: "gold",
                            tagline: false,
                          }}
                          createOrder={(data, actions) => {
                            return actions.order.create({
                              intent: "CAPTURE",
                              purchase_units: [
                                {
                                  description: `${product.ai_title_en || product.ai_title_local || "Artisan Handloom Saree"} (Artisan: ${artisan.full_name})`,
                                  amount: {
                                    currency_code: "USD",
                                    value: usdPrice.toFixed(2),
                                  },
                                },
                              ],
                            });
                          }}
                          onApprove={async (data, actions) => {
                            if (actions.order) {
                              const details = await actions.order.capture();
                              const orderId = details.id || data.orderID || "SANDBOX-ORDER";
                              setPaypalSuccessOrder({
                                orderId,
                                productTitle: product.ai_title_en || product.ai_title_local || "Handcrafted Heritage Creation",
                                amount: `$${usdPrice.toFixed(2)} USD`,
                              });
                            }
                          }}
                          onError={(err) => {
                            console.error("PayPal Checkout Error:", err);
                            showToast("PayPal transaction error. Please try again.");
                          }}
                        />
                      </div>
                    </div>
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

      {/* ── International PayPal Order Success Modal ── */}
      {paypalSuccessOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 relative">
            {/* Close Button */}
            <button
              onClick={() => setPaypalSuccessOrder(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition"
            >
              <X size={20} />
            </button>

            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mb-4 shadow-inner">
              <Check size={32} strokeWidth={2.5} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold tracking-wide uppercase mb-2">
              <Globe size={12} className="text-emerald-600" />
              <span>International Export Order Confirmed</span>
            </div>

            <h3 className={`text-2xl text-stone-900 font-bold mb-2 ${playfair.className}`}>
              Thank You for Your Order!
            </h3>

            <p className="text-xs text-stone-600 mb-6 font-light leading-relaxed">
              Your direct export purchase directly empowers traditional weavers in rural India. Your order will be prepared with insured worldwide boutique shipping.
            </p>

            {/* Order Details Card */}
            <div className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-2.5 mb-6 text-xs">
              <div className="flex justify-between items-start gap-2">
                <span className="text-stone-500 font-medium">Creation:</span>
                <span className="font-semibold text-stone-900 text-right">{paypalSuccessOrder.productTitle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Amount Paid:</span>
                <span className="font-bold text-stone-900">{paypalSuccessOrder.amount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">PayPal Order ID:</span>
                <span className="font-mono text-stone-700 text-[11px] bg-white px-2 py-0.5 rounded border border-stone-200 truncate max-w-[180px]">
                  {paypalSuccessOrder.orderId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Artisan Beneficiary:</span>
                <span className="font-semibold text-stone-800">{artisan.full_name}</span>
              </div>
              {artisan.paypal_email && (
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-medium">Artisan PayPal:</span>
                  <span className="font-mono text-stone-700 text-[11px]">{artisan.paypal_email}</span>
                </div>
              )}
            </div>

            {/* Heritage Certificate Badge */}
            <div className="w-full p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-3 text-left mb-6">
              <div className="w-8 h-8 rounded-full bg-amber-200/60 flex items-center justify-center text-amber-800 shrink-0">
                📜
              </div>
              <div className="text-[11px] text-amber-900">
                <span className="font-bold block">Weaver Provenance Certificate</span>
                Your shipment includes an authenticity certificate signed by {artisan.full_name}.
              </div>
            </div>

            <button
              onClick={() => setPaypalSuccessOrder(null)}
              className="w-full py-3 bg-stone-900 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-stone-800 transition active:scale-[0.99] shadow-md"
            >
              Continue Exploring Boutique
            </button>
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
  </PayPalScriptProvider>
  );
}
