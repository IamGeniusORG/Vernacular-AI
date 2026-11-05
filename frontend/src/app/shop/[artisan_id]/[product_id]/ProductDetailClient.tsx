"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SlideOverPage from "@/components/PageTransition";
import {
  ArrowLeft,
  Share2,
  MessageCircle,
  Zap,
  Globe,
  Volume2,
  Play,
  Pause,
  Clock,
  HeartHandshake,
  Check,
  Copy,
  X,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { type Artisan, type Product, getLocalizedProductTitle, getLocalizedProductDesc } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { usePreferences } from "@/context/PreferencesContext";
import { playfair } from "@/lib/fonts";
import UniversalAvatar from "@/components/UniversalAvatar";
import { enqueueOfflineAction, isOffline } from "@/lib/offlineQueue";
import { getProductFallbackImage, getProductImage } from "@/lib/placeholders";

interface Props {
  artisan: Artisan;
  product: Product;
}

export default function ProductDetailClient({ artisan, product }: Props) {
  const router = useRouter();
  const { t, activeLanguage } = useLanguage();
  const { currency, setCurrency } = usePreferences();
  const destination: "domestic" | "international" = currency === "USD" ? "international" : "domestic";
  const setDestination = (dest: "domestic" | "international") => {
    setCurrency(dest === "international" ? "USD" : "INR");
  };

  const handleNavigateBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/shop/${artisan.id}`);
    }
  };

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeUpiModal, setActiveUpiModal] = useState(false);
  const [activeTipModal, setActiveTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(50);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Dynamic Category Fallback Image
  const fallbackCategoryImg = getProductFallbackImage(
    product.ai_title_en || product.ai_title_local,
    product.craft || product.category || (product.tags ? product.tags.join(" ") : null)
  );

  // Gallery State Management (defaults to active image index 0)
  const rawGallery: string[] = (product.images && product.images.length > 0)
    ? product.images
    : (product.image_url ? [product.image_url] : []);
  const galleryImages: string[] = rawGallery.length > 0 ? rawGallery : [fallbackCategoryImg];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const currentHeroImage = galleryImages[activeImageIndex] || fallbackCategoryImg;

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Pricing calculations
  const inrPrice = product.price || product.price_inr || 1500;
  const rawUsd = product.price_usd || product.suggested_usd_price;
  const usdPrice = rawUsd && rawUsd > 0 ? Number(rawUsd) : Math.max(25, Number((inrPrice / 75).toFixed(2)));

  // Stock status
  const stock =
    product.stock_quantity !== undefined && product.stock_quantity !== null
      ? product.stock_quantity
      : product.in_stock === false
      ? 0
      : 1;
  const isSoldOut = stock <= 0 || product.in_stock === false;
  const isLowStock = !isSoldOut && stock >= 1 && stock <= 3;
  const weavingDays = product.estimated_weaving_days;

  const hasWhatsApp = Boolean(artisan.whatsapp_number || artisan.phone_number);
  const hasPaymentConfigured = Boolean(artisan.upi_id || artisan.qr_code_url);
  const hasPayPal = Boolean(artisan.paypal_email);

  // Audio Playback Controller
  const toggleMobileAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch(() => showToast("Could not play audio story."));
    }
  };

  // Native & Clipboard Share
  const handleShare = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const deepLink = `${origin}/shop/${artisan.id}/${product.id}`;
    const productTitle = product.ai_title_en || product.ai_title_local || "Handcrafted Heritage Textile";
    const shareTitle = `${productTitle} by ${artisan.full_name} | Vernacular AI`;
    const shareText = `Check out this authentic handloom creation by ${artisan.full_name} on Vernacular AI:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: deepLink,
        });
        showToast("Shared successfully!");
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(deepLink);
      setCopiedLink(true);
      showToast("Direct product link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // WhatsApp Order Flow
  const handleWhatsApp = () => {
    const rawPhone = artisan.whatsapp_number || artisan.phone_number || "";
    const digits = rawPhone.replace(/\D/g, "");

    if (!digits || digits.length < 7 || rawPhone.toLowerCase().includes("unknown")) {
      showToast("Artisan has not set a WhatsApp number yet.");
      return;
    }

    const cleanPhone = digits.length === 10 ? `91${digits}` : digits;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const deepLink = `${origin}/shop/${artisan.id}/${product.id}`;
    const productTitle = product.ai_title_en || product.ai_title_local || "Handloom Creation";

    let message = "";
    if (isSoldOut) {
      message = `Namaste ${artisan.full_name}, I see this product "${productTitle}" is currently out of stock. I would like to place a custom order for it: ${deepLink}`;
    } else {
      message = `Namaste ${artisan.full_name}, I would like to purchase "${productTitle}" listed at ₹${inrPrice} on your Artisan Storefront: ${deepLink}`;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    showToast(isSoldOut ? "Opening WhatsApp for custom order..." : "Opening WhatsApp...");
  };

  // Copy UPI ID
  const handleCopyUpi = (upiId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      showToast("UPI ID copied to clipboard!");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  // Direct Tipping Handler
  const handleRecordTip = async (amount: number, currency: string, method: string) => {
    const payload = {
      artisan_id: artisan.id,
      amount,
      currency,
      payment_method: method,
      patron_name: "Valued Patron",
    };

    if (isOffline()) {
      await enqueueOfflineAction({
        type: "GENERIC_API",
        endpoint: `/api/v1/artisans/${artisan.id}/tip`,
        method: "POST",
        payload,
        artisanId: artisan.id,
        description: `Direct tip of ${currency} ${amount} to ${artisan.full_name}`,
      });
      showToast("Tip saved offline. Will sync when internet returns.");
      setTipSuccess(true);
      return;
    }

    try {
      await fetch(`/api/v1/artisans/${artisan.id}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setTipSuccess(true);
      showToast("Thank you for supporting this artisan directly!");
    } catch {
      showToast("Tip recorded locally. Thank you for your patronage!");
      setTipSuccess(true);
    }
  };

  const productTitle = getLocalizedProductTitle(product, activeLanguage);
  const displayDesc =
    destination === "international" && activeLanguage === "en" && product.export_description
      ? product.export_description
      : getLocalizedProductDesc(product, activeLanguage);

  const upiDeepLink = artisan.upi_id
    ? `upi://pay?pa=${encodeURIComponent(artisan.upi_id)}&pn=${encodeURIComponent(
        artisan.full_name
      )}&am=${inrPrice}&cu=INR&tn=${encodeURIComponent(`Order: ${productTitle.slice(0, 30)}`)}`
    : "";

  return (
    <SlideOverPage fallbackBackUrl={`/shop/${artisan.id}`} onBack={handleNavigateBack}>
      <div className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20 select-none">
        {/* ── Top Header Navigation ── */}
        <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-200/80 safe-pt-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleNavigateBack}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-700 hover:text-neutral-950 transition active:scale-95 group cursor-pointer"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>{t("back_to_catalog", "Back to Catalog")}</span>
            </button>

          <div className="flex items-center gap-2.5">
            {/* Destination Toggle */}
            <div className="inline-flex rounded-full bg-stone-200/60 p-1 border border-stone-300/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDestination("domestic")}
                className={`px-3 py-1 rounded-full transition-all ${
                  destination === "domestic"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                🇮🇳 Domestic (INR)
              </button>
              <button
                type="button"
                onClick={() => setDestination("international")}
                className={`px-3 py-1 rounded-full transition-all ${
                  destination === "international"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                🌍 Export (USD)
              </button>
            </div>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-full bg-white border border-stone-200 text-neutral-700 hover:text-neutral-950 hover:bg-stone-50 transition shadow-2xs active:scale-95"
              title="Share Creation"
            >
              {copiedLink ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Large Product Imagery & Audio (5-6 Cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* Main Hero Image Container */}
            <div className="relative w-full aspect-[4/5] sm:aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden bg-white border border-stone-200 shadow-md">
              <Image
                key={currentHeroImage}
                src={currentHeroImage}
                alt={product.ai_title_en || product.ai_title_local || "Handloom Creation"}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                unoptimized={Boolean(currentHeroImage?.startsWith("http"))}
                className="object-cover object-top transition-opacity duration-300 animate-in fade-in"
              />

              {/* Price Pill */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md text-neutral-950 text-base sm:text-lg font-bold px-4 py-1.5 rounded-full shadow-md z-10 border border-stone-200/70">
                {destination === "international" ? `$${usdPrice.toFixed(2)} USD` : `₹${inrPrice}`}
              </div>

              {/* Sold Out / Low Stock Badges */}
              {isSoldOut ? (
                <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <span className="bg-neutral-900/95 text-white text-xs sm:text-sm font-bold uppercase tracking-widest px-5 py-2.5 rounded-full shadow-xl border border-white/20">
                    {t("sold_out", "Sold Out")}
                  </span>
                </div>
              ) : isLowStock ? (
                <div className="absolute top-4 left-4 bg-rose-600/95 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow z-10 animate-pulse">
                  Only {stock} Left in Stock
                </div>
              ) : null}
            </div>

            {/* Interactive Thumbnail Strip */}
            {galleryImages.length > 1 && (
              <div className="flex overflow-x-auto space-x-3 py-2 scrollbar-hide select-none">
                {galleryImages.map((imgSrc, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "border-2 border-amber-700 ring-2 ring-amber-500/30 opacity-100 scale-100 shadow-sm"
                          : "border border-stone-200 opacity-60 hover:opacity-100 scale-95"
                      }`}
                      aria-label={`View photo angle ${idx + 1}`}
                    >
                      <Image
                        src={imgSrc}
                        alt={`${product.ai_title_en || 'Product'} angle ${idx + 1}`}
                        fill
                        sizes="80px"
                        unoptimized={imgSrc.startsWith("http")}
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Audio Story Section */}
            {product.audio_url && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Volume2 size={15} className="text-amber-700" />
                    {t("voice_of_weaver", "Voice of the Weaver")}
                  </span>

                  {/* Compact Mobile Audio Toggle */}
                  <button
                    type="button"
                    onClick={toggleMobileAudio}
                    className="md:hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-700 text-white text-xs font-bold shadow-xs active:scale-95 transition"
                  >
                    {isPlayingAudio ? (
                      <>
                        <Pause size={12} /> Pause Voice
                      </>
                    ) : (
                      <>
                        <Play size={12} className="fill-white" /> Play Voice
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-amber-800/90 leading-relaxed font-light">
                  Spoken directly by {artisan.full_name} in their native dialect describing the craft, motifs, and weaving tradition.
                </p>

                {/* Hidden/Desktop Native Audio Element */}
                <audio
                  ref={audioRef}
                  controls
                  preload="metadata"
                  src={product.audio_url}
                  onPlay={() => setIsPlayingAudio(true)}
                  onPause={() => setIsPlayingAudio(false)}
                  onEnded={() => setIsPlayingAudio(false)}
                  className="w-full h-9 mt-1 rounded-full bg-white [&::-webkit-media-controls-panel]:bg-white hidden md:block"
                >
                  <source src={product.audio_url} type="audio/webm" />
                  <source src={product.audio_url} type="audio/mp4" />
                  <source src={product.audio_url} type="audio/mpeg" />
                  Your browser does not support audio.
                </audio>
              </div>
            )}
          </div>

          {/* Right Column: Detailed Product Info & Actions (6-7 Cols) */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            <div>
              {/* Regional Craft Badge */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/20">
                  {artisan.district || "Heritage Handloom"}
                </span>
                {destination === "international" && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                    <Globe size={12} /> Global Export Certified
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 leading-tight ${playfair.className}`}>
                {productTitle}
              </h1>
              {product.ai_title_en && product.ai_title_en !== productTitle && (
                <p className="text-sm sm:text-base text-neutral-500 font-light mt-1">
                  {product.ai_title_en}
                </p>
              )}
            </div>

            {/* Price & Currency Display */}
            <div className="flex items-baseline gap-3 p-4 bg-stone-100/70 border border-stone-200/80 rounded-2xl">
              <span className="text-3xl font-extrabold text-neutral-950">
                {destination === "international" ? `$${usdPrice.toFixed(2)} USD` : `₹${inrPrice}`}
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                {destination === "international" ? "Includes international transit packing" : "100% direct-to-weaver, 0% platform fee"}
              </span>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-white border border-stone-200 text-xs font-medium text-neutral-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Craft Story & Specifications
              </h3>
              <p className="text-sm sm:text-base text-neutral-700 leading-relaxed font-light whitespace-pre-line">
                {displayDesc || "Authentic handloom textile woven on traditional wooden pit-looms using heritage techniques passed down through generations."}
              </p>
            </div>

            {/* ── Call-To-Action Commerce Block ── */}
            <div className="p-5 bg-white border border-stone-200/90 rounded-3xl shadow-sm space-y-4">
              {/* Estimated Weaving Time Badge */}
              {isSoldOut && weavingDays && weavingDays > 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200/90 text-amber-900 rounded-xl text-xs font-semibold animate-in fade-in">
                  <Clock size={16} className="text-amber-700 shrink-0" />
                  <span>⏱️ Takes ~{weavingDays} days to weave a new custom piece on demand.</span>
                </div>
              )}

              {/* Primary Actions based on Destination & Stock */}
              {destination === "international" ? (
                <div className="space-y-3">
                  {isSoldOut ? (
                    <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-center space-y-2">
                      <p className="text-xs font-bold text-neutral-700">
                        This creation is currently sold out for instant checkout.
                      </p>
                      <p className="text-xs text-neutral-500">
                        You can commission a custom handcrafted piece directly with {artisan.full_name} on WhatsApp.
                      </p>
                      <button
                        type="button"
                        onClick={handleWhatsApp}
                        className="w-full py-3 bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
                      >
                        <MessageCircle size={18} />
                        <span>Order on WhatsApp</span>
                      </button>
                    </div>
                  ) : hasPayPal ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs px-1 text-emerald-800 font-bold">
                        <span className="flex items-center gap-1">
                          <Globe size={13} /> Insured Global Checkout
                        </span>
                        <span>${usdPrice.toFixed(2)} USD</span>
                      </div>
                      <PayPalButtons
                        style={{ layout: "vertical", height: 42, shape: "rect", color: "gold" }}
                        createOrder={(data, actions) => {
                          return actions.order.create({
                            intent: "CAPTURE",
                            purchase_units: [
                              {
                                description: `${productTitle} (Artisan: ${artisan.full_name})`,
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
                            await actions.order.capture();
                            showToast("Order captured! Thank you for supporting Indian handloom artisans.");
                          }
                        }}
                        onError={() => showToast("PayPal transaction error. Please try again.")}
                      />
                      <button
                        type="button"
                        onClick={handleWhatsApp}
                        className="w-full py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-neutral-800 hover:bg-stone-50 transition flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={15} /> Inquire on WhatsApp
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-center p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-xs font-bold text-amber-900">Direct Export Inquiries</p>
                      <button
                        type="button"
                        onClick={handleWhatsApp}
                        className="w-full py-3 bg-neutral-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={18} /> Inquire for Export on WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* WhatsApp Buy / Order Button */}
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
                      hasWhatsApp
                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                        : "bg-stone-200 text-stone-500 cursor-not-allowed"
                    }`}
                  >
                    <MessageCircle size={18} />
                    <span>{isSoldOut ? "Order on WhatsApp" : "Buy on WhatsApp"}</span>
                  </button>

                  {/* Instant UPI Pay (Zero Fee) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasPaymentConfigured) {
                        showToast("Artisan has not added their payment QR yet.");
                        return;
                      }
                      setActiveUpiModal(true);
                    }}
                    disabled={isSoldOut}
                    className={`w-full py-3 rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition active:scale-95 border ${
                      isSoldOut
                        ? "opacity-50 cursor-not-allowed pointer-events-none text-gray-500 bg-gray-200 border-gray-300"
                        : "bg-amber-50 text-amber-950 border-amber-300/80 hover:bg-amber-100 shadow-xs"
                    }`}
                  >
                    <Zap size={15} className={isSoldOut ? "text-gray-400" : "text-amber-600 fill-amber-500"} />
                    <span>{isSoldOut ? "Instant Payment Unavailable (Sold Out)" : "Instant Direct UPI Pay (0% Fee)"}</span>
                  </button>
                </div>
              )}

              {/* Direct Weaver Tip Button */}
              <button
                type="button"
                onClick={() => setActiveTipModal(true)}
                className="w-full py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/90 text-xs font-semibold text-neutral-700 flex items-center justify-center gap-2 transition active:scale-95"
              >
                <HeartHandshake size={15} className="text-[#C85A32]" />
                <span>Tip the Artisan directly (100% Weaver Proceeds)</span>
              </button>
            </div>

            {/* ── Artisan Bio Card ── */}
            <div className="p-5 bg-white border border-stone-200 rounded-3xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <UniversalAvatar user={artisan} size="lg" className="border-2 border-stone-200" />
                <div>
                  <h4 className={`text-base font-bold text-neutral-900 ${playfair.className}`}>
                    {artisan.full_name}
                  </h4>
                  <p className="text-xs text-neutral-500">{artisan.district || "West Bengal, India"}</p>
                </div>
              </div>

              <Link
                href={`/shop/${artisan.id}`}
                className="px-4 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-xs font-bold text-neutral-800 transition flex items-center gap-1.5 active:scale-95"
              >
                <span>View Collection</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ── Zero-Fee UPI Modal ── */}
      {activeUpiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 relative text-center">
            <button
              onClick={() => setActiveUpiModal(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full"
            >
              <X size={18} />
            </button>

            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-3 inline-block">
              100% Direct Payout (0% Commission)
            </span>

            <h3 className={`text-xl font-bold text-neutral-900 mb-1 ${playfair.className}`}>
              Pay {artisan.full_name}
            </h3>
            <p className="text-2xl font-black text-neutral-950 mb-4">₹{inrPrice}</p>

            {/* Real QR or Generated Banking QR */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex justify-center mb-4">
              {artisan.qr_code_url ? (
                <Image
                  src={artisan.qr_code_url}
                  alt="Artisan Merchant QR Code"
                  width={220}
                  height={220}
                  unoptimized
                  className="rounded-xl object-contain max-h-[220px]"
                />
              ) : upiDeepLink ? (
                <QRCodeSVG value={upiDeepLink} size={200} level="M" />
              ) : (
                <p className="text-xs text-neutral-500 py-8">QR code unavailable</p>
              )}
            </div>

            {/* Mobile 1-Tap App Launch */}
            {upiDeepLink && (
              <a
                href={upiDeepLink}
                className="w-full py-3 mb-3 bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
              >
                <Zap size={14} /> Open in GPay / PhonePe / Paytm
              </a>
            )}

            {artisan.upi_id && (
              <div className="flex items-center justify-between p-2.5 bg-stone-100 rounded-xl text-xs">
                <span className="font-mono text-neutral-700 truncate">{artisan.upi_id}</span>
                <button
                  type="button"
                  onClick={() => handleCopyUpi(artisan.upi_id!)}
                  className="p-1.5 text-neutral-700 hover:text-neutral-900 active:scale-90"
                >
                  {copiedUpi ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Direct Tip Modal ── */}
      {activeTipModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 relative text-center">
            <button
              onClick={() => {
                setActiveTipModal(false);
                setTipSuccess(false);
              }}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#C85A32] flex items-center justify-center mx-auto mb-3">
              <HeartHandshake size={24} />
            </div>

            <h3 className={`text-xl font-bold text-neutral-900 mb-1 ${playfair.className}`}>
              Tip {artisan.full_name}
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Your patronage directly supports the weaver&apos;s family and preserves generational handloom heritage.
            </p>

            {tipSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
                <ShieldCheck size={28} className="mx-auto text-emerald-600" />
                <p className="text-sm font-bold">Patronage Recorded!</p>
                <p className="text-xs text-emerald-700">100% of your tip has been registered directly for the weaver.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[20, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTipAmount(amt)}
                      className={`py-2 rounded-xl text-sm font-bold border transition ${
                        tipAmount === amt
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-700 border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleRecordTip(tipAmount, "INR", "direct_upi")}
                  className="w-full py-3 bg-[#C85A32] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#B34D27] transition active:scale-95"
                >
                  Send ₹{tipAmount} Tip
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span>{toastMsg}</span>
        </div>
      )}
      </div>
    </SlideOverPage>
  );
}
