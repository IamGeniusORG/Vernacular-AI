"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingBag, MessageCircle, BadgeCheck, Camera, Zap, X, Copy, Check, ArrowLeft, Volume2, Globe, Heart, AlertCircle, Share2, Loader2, Clock, Play, Pause } from "lucide-react";
import { Product, Artisan, getLocalizedProductTitle, getLocalizedProductDesc } from "@/lib/api";
import { useArtisan } from "@/context/ArtisanContext";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import Image from "next/image";
import { playfair } from "@/lib/fonts";
import { QRCodeCanvas } from "qrcode.react";
import Marquee from "@/components/Marquee";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import UniversalAvatar from "@/components/UniversalAvatar";
import UserDropdown from "@/components/UserDropdown";
import LanguageToggle from "@/components/LanguageToggle";
import { LanguageTransitionWrapper } from "@/components/LanguageTransitionProvider";
import { usePreferences } from "@/context/PreferencesContext";
import { enqueueOfflineAction } from "@/lib/offlineQueue";
import { getProductImage, getProductFallbackImage } from "@/lib/placeholders";
import { useScrollRestoration, saveScrollPosition } from "@/hooks/useScrollRestoration";

interface Props {
  products: Product[];
  artisan: Artisan;
}

export default function StorefrontClient({ products, artisan }: Props) {
  // Preserve & restore exact scroll position when returning from product deep-links
  useScrollRestoration(Boolean(products && products.length > 0));

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [productFailedImages, setProductFailedImages] = useState<Record<string, boolean>>({});
  const [activeUpiProduct, setActiveUpiProduct] = useState<Product | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [shuffledProducts, setShuffledProducts] = useState<Product[]>(products);
  const [activeIndex, setActiveIndex] = useState(0);
  const { currency, setCurrency } = usePreferences();
  const destination: "domestic" | "international" = currency === "USD" ? "international" : "domestic";
  const setDestination = (dest: "domestic" | "international") => {
    setCurrency(dest === "international" ? "USD" : "INR");
  };
  const [paypalSuccessOrder, setPaypalSuccessOrder] = useState<{
    orderId: string;
    productTitle: string;
    amount: string;
  } | null>(null);

  // Tip / Direct Patronage State
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [tipCurrency, setTipCurrency] = useState<"INR" | "USD">("INR");
  const [tipPreset, setTipPreset] = useState<number>(250);
  const [customTip, setCustomTip] = useState<string>("");
  const [patronName, setPatronName] = useState<string>("");
  const [tipSuccess, setTipSuccess] = useState<{ amount: string; method: string } | null>(null);
  const [isRecordingTip, setIsRecordingTip] = useState(false);
  const [isQrLightboxOpen, setIsQrLightboxOpen] = useState(false);
  const [lightboxSubtitle, setLightboxSubtitle] = useState<string>("");
  const [lightboxUri, setLightboxUri] = useState<string>("");
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const mobileAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleToggleMobileAudio = (audioUrl: string) => {
    if (!mobileAudioRef.current) {
      mobileAudioRef.current = new Audio(audioUrl);
      mobileAudioRef.current.onended = () => setPlayingAudioUrl(null);
    }
    if (playingAudioUrl === audioUrl) {
      mobileAudioRef.current.pause();
      setPlayingAudioUrl(null);
    } else {
      mobileAudioRef.current.src = audioUrl;
      mobileAudioRef.current
        .play()
        .then(() => setPlayingAudioUrl(audioUrl))
        .catch(() => showToast("Could not play voice story."));
    }
  };

  useEffect(() => {
    return () => {
      if (mobileAudioRef.current) {
        mobileAudioRef.current.pause();
        mobileAudioRef.current = null;
      }
    };
  }, []);

  const { artisanId } = useArtisan();
  const { t, activeLanguage } = useLanguage();
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

  // Non-blocking visitor analytics tracking
  useEffect(() => {
    if (!artisan?.id) return;
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    try {
      fetch(`${backendUrl}/api/v1/analytics/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artisan_id: artisan.id,
          country: destination === "international" ? "International" : "India",
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, [artisan?.id, destination]);

  // ESC key listener to dismiss full-screen QR Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isQrLightboxOpen) {
        setIsQrLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQrLightboxOpen]);

  const openQrLightbox = (uri: string, subtitle: string) => {
    setLightboxUri(uri);
    setLightboxSubtitle(subtitle);
    setIsQrLightboxOpen(true);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleBuy = (product: Product) => {
    const rawPhone = artisan.whatsapp_number || artisan.phone_number || "";
    const digits = rawPhone.replace(/\D/g, "");
    
    if (!digits || digits.length < 7 || rawPhone.toLowerCase().includes("unknown")) {
      showToast("Artisan has not set a WhatsApp number yet.");
      return;
    }
    
    // Ensure country code 91 if exactly 10 digits
    const cleanPhone = digits.length === 10 ? `91${digits}` : digits;
    const price = product.price || product.price_inr || 1500;
    const productTitle = product.ai_title_en || product.ai_title_local || "Handloom Creation";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const deepLink = `${origin}/shop/${artisan.id}/${product.id}`;

    const stock = product.stock_quantity !== undefined && product.stock_quantity !== null
      ? product.stock_quantity
      : (product.in_stock === false ? 0 : 1);
    const isSoldOut = stock <= 0 || product.in_stock === false;

    let text = "";
    if (isSoldOut) {
      text = `Namaste ${artisan.full_name}, I see this product "${productTitle}" is currently out of stock. I would like to place a custom order for it: ${deepLink}`;
    } else {
      text = `Namaste ${artisan.full_name}, I would like to purchase "${productTitle}" listed at ₹${price} on your Artisan Storefront: ${deepLink}`;
    }
    
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    showToast(isSoldOut ? "Opening WhatsApp for custom order..." : "Opening WhatsApp...");
  };

  const handleCopyUpi = (upiId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      showToast("UPI ID copied to clipboard!");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleShareProfile = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `Handcrafted Heritage Creations by ${artisan.full_name} | Vernacular AI`;
    const text = `Check out these handcrafted masterpieces by ${artisan.full_name} on Vernacular AI:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        showToast("Shared successfully!");
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast("Profile link copied to clipboard!");
    }
  };

  const handleShareProduct = async (product: Product) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/shop/${artisan.id}/${product.id}`;
    const productTitle = product.ai_title_en || product.ai_title_local || "Handcrafted Masterpiece";
    const title = `${productTitle} by ${artisan.full_name} | Vernacular AI`;
    const text = `Check out this handcrafted masterpiece by ${artisan.full_name} on Vernacular AI:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        showToast("Shared successfully!");
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      showToast("Product link copied to clipboard!");
    }
  };

  const [isReportingUpi, setIsReportingUpi] = useState(false);

  const handleRecordOrder = async (
    product: Product,
    paymentMethod: "paypal" | "upi",
    status: "completed" | "pending",
    amount: number,
    orderCurrency: "INR" | "USD",
    transactionId?: string,
    buyerName?: string
  ) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      await fetch(`${backendUrl}/api/v1/orders/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artisan_id: artisan.id,
          product_id: product.id,
          amount,
          currency: orderCurrency,
          payment_method: paymentMethod,
          status,
          transaction_id: transactionId,
          buyer_name: buyerName || "Anonymous Patron",
        }),
      });

      // Optimistically decrement local stock quantity in state
      setShuffledProducts((prev) =>
        prev.map((p) => {
          if (p.id === product.id) {
            const currentQty = p.stock_quantity ?? (p.in_stock === false ? 0 : 1);
            const nextQty = Math.max(0, currentQty - 1);
            return {
              ...p,
              stock_quantity: nextQty,
              in_stock: nextQty > 0,
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.warn("Order recording notice:", err);
    }
  };

  const handleReportUpiPayment = async () => {
    if (!activeUpiProduct) return;
    setIsReportingUpi(true);
    const upiPrice = activeUpiProduct.price || activeUpiProduct.price_inr || 1500;

    // Offline Interception for UPI report button
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOfflineAction({
        type: "GENERIC_API",
        endpoint: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/v1/orders/record`,
        method: "POST",
        payload: {
          product_id: activeUpiProduct.id,
          artisan_id: activeUpiProduct.artisan_id || artisan.id,
          amount: upiPrice,
          currency: "INR",
          payment_method: "upi",
          status: "pending",
          transaction_id: `UPI-REF-${Date.now().toString().slice(-6)}`,
          buyer_name: patronName || "Valued Patron",
        },
        artisanId: activeUpiProduct.artisan_id || artisan.id,
        description: `Pending UPI order for ${activeUpiProduct.ai_title_en || "item"}`,
      });
      showToast("Saved offline. Will sync when internet returns.");
      setActiveUpiProduct(null);
      setIsReportingUpi(false);
      return;
    }

    try {
      await handleRecordOrder(
        activeUpiProduct,
        "upi",
        "pending",
        upiPrice,
        "INR",
        `UPI-REF-${Date.now().toString().slice(-6)}`,
        patronName || "Valued Patron"
      );
      showToast("Payment reported! Waiting for artisan confirmation.");
      setActiveUpiProduct(null);
    } catch {
      showToast("Payment reported! Waiting for artisan confirmation.");
      setActiveUpiProduct(null);
    } finally {
      setIsReportingUpi(false);
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

  // Active product UPI & Payment Details (Real World, No Demo Fallbacks)
  const hasRealQr = Boolean(artisan.qr_code_url && artisan.qr_code_url.trim());
  const hasRealUpi = Boolean(
    artisan.upi_id &&
    artisan.upi_id.trim() &&
    !artisan.upi_id.toLowerCase().includes("demoartisan") &&
    artisan.upi_id.includes("@")
  );
  const hasPaymentConfigured = hasRealQr || hasRealUpi;
  const rawWhatsApp = (artisan.whatsapp_number || artisan.phone_number || "").trim();
  const digitsOnly = rawWhatsApp.replace(/\D/g, "");
  const hasWhatsApp = Boolean(digitsOnly && digitsOnly.length >= 7 && !rawWhatsApp.toLowerCase().includes("unknown"));
  const hasPayPal = Boolean(artisan.paypal_email && artisan.paypal_email.trim() && artisan.paypal_email.includes("@"));
  const upiId = hasRealUpi ? artisan.upi_id!.trim() : "";
  const upiPrice = activeUpiProduct ? (activeUpiProduct.price || activeUpiProduct.price_inr || 1500) : 1500;
  const upiTitle = activeUpiProduct ? (activeUpiProduct.ai_title_en || activeUpiProduct.ai_title_local || "Handloom Creation") : "Handloom Creation";
  const upiUri = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(artisan.full_name)}&am=${upiPrice}&cu=INR&tn=${encodeURIComponent(upiTitle)}` : "";

  // Direct Patronage Tip Calculations (Enforces ₹10 Minimum for INR)
  const parsedCustomTip = customTip && !isNaN(Number(customTip)) ? Number(customTip) : 0;
  const effectiveTipAmount = parsedCustomTip > 0
    ? (tipCurrency === "INR" ? Math.max(10, parsedCustomTip) : Math.max(1, parsedCustomTip))
    : tipPreset;
  const tipUpiUri = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(artisan.full_name)}&am=${effectiveTipAmount}&cu=INR&tn=${encodeURIComponent('Patronage Tip for ' + artisan.full_name)}` : "";

  const handleRecordTip = async (method: "upi" | "paypal", orderId?: string) => {
    if (tipCurrency === "INR" && effectiveTipAmount < 10) {
      showToast("Minimum tip amount is ₹10.");
      return;
    }
    setIsRecordingTip(true);

    // Offline Interception for Tip Submission
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOfflineAction({
        type: "GENERIC_API",
        endpoint: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/v1/artisans/${artisan.id}/tip`,
        method: "POST",
        payload: {
          amount: effectiveTipAmount,
          currency: tipCurrency,
          payment_method: method,
          patron_name: patronName.trim() || "Anonymous Patron",
          order_id: orderId,
        },
        artisanId: artisan.id,
        description: `Direct Tip to ${artisan.full_name}`,
      });
      showToast("Saved offline. Will sync when internet returns.");
      setTipSuccess({
        amount: tipCurrency === "INR" ? `₹${effectiveTipAmount}` : `$${effectiveTipAmount.toFixed(2)} USD`,
        method: method.toUpperCase(),
      });
      setIsRecordingTip(false);
      return;
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      await fetch(`${backendUrl}/api/v1/artisans/${artisan.id}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: effectiveTipAmount,
          currency: tipCurrency,
          payment_method: method,
          patron_name: patronName.trim() || "Anonymous Patron",
          order_id: orderId,
        }),
      });
      showToast("🎉 Tip recorded! Thank you for supporting " + artisan.full_name);
      setTipSuccess({
        amount: tipCurrency === "INR" ? `₹${effectiveTipAmount}` : `$${effectiveTipAmount.toFixed(2)} USD`,
        method: method.toUpperCase(),
      });
    } catch (err) {
      console.error("Tip record error:", err);
      showToast("🎉 Tip recorded! Thank you for supporting " + artisan.full_name);
      setTipSuccess({
        amount: tipCurrency === "INR" ? `₹${effectiveTipAmount}` : `$${effectiveTipAmount.toFixed(2)} USD`,
        method: method.toUpperCase(),
      });
    } finally {
      setIsRecordingTip(false);
    }
  };

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        currency: "USD",
        components: "buttons",
      }}
      deferLoading={destination !== "international" && !(isTipModalOpen && tipCurrency === "USD")}
    >
      <div className="min-h-screen bg-[#F9F8F6] font-sans text-neutral-800">

        {/* ── Marquee Announcement Bar ── */}
        <Marquee />

        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-50 bg-[#F9F8F6]/90 backdrop-blur-md border-b border-stone-200 px-4 md:px-8 py-3.5 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] flex items-center justify-between select-none">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link 
              href="/shop" 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-stone-100 active:bg-stone-200 text-neutral-800 rounded-full text-xs sm:text-sm font-semibold transition border border-stone-200/90 shadow-sm shrink-0 group"
              title="Back to Directory"
            >
              <ArrowLeft size={16} className="text-neutral-500 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">{t("back_to_directory")}</span>
              <span className="inline sm:hidden">{t("nav_directory")}</span>
            </Link>
            <div className="h-5 w-px bg-stone-300 hidden sm:block shrink-0"></div>
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <UniversalAvatar user={artisan} size="sm" showBorder />
              <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                <h1 className={`text-base sm:text-lg md:text-xl text-neutral-900 truncate ${playfair.className}`}>
                  {artisan.full_name}{t("loom_suffix")}
                </h1>
                <BadgeCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            {isOwner && (
              <Link
                href="/studio"
                className="hidden sm:inline-flex px-3.5 py-1.5 bg-neutral-900 text-white rounded-full text-xs font-semibold items-center gap-1.5 hover:bg-neutral-800 transition shadow-sm"
              >
                <Camera size={13} /> <span>{t("studio_dashboard")}</span>
              </Link>
            )}
            <UserDropdown />
          </div>
        </header>

        {/* ── Main Content Wrapped with Global Language Transition ── */}
        <LanguageTransitionWrapper as="main" className="w-full relative">
          {/* ── Breadcrumb Navigation ── */}
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-0">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-amber-800 transition group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform text-neutral-400 group-hover:text-amber-800" />
            <span>{t("explore_marketplace")}</span>
            <span className="text-stone-300">/</span>
            <span className="text-neutral-800 font-bold">{artisan.full_name}</span>
          </Link>
        </div>

        {/* ── Artisan Profile Banner Header ── */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-2">
          <div className="relative rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm bg-white">
            {/* Banner Background (Default clean slate-50/white if no custom banner uploaded) */}
            <div className="h-36 sm:h-48 md:h-56 w-full relative bg-slate-50 border-b border-stone-200/60 overflow-hidden">
              {artisan.banner_url ? (
                <>
                  <Image
                    src={artisan.banner_url}
                    alt={`${artisan.full_name} cover photo`}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover object-center"
                    unoptimized={artisan.banner_url.startsWith("http")}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                </>
              ) : (
                <div className="w-full h-full bg-slate-50" />
              )}
            </div>

            {/* Profile Bar below banner */}
            <div className="px-5 sm:px-8 pb-5 pt-3 sm:pt-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 relative">
              <div className="flex items-end gap-3 sm:gap-4 -mt-14 sm:-mt-16 z-10">
                <UniversalAvatar
                  user={artisan}
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
                    {artisan.district || "West Bengal, India"} • {products.length} {products.length === 1 ? t("creation") : t("creations_count")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareProfile}
                  className="px-4 py-2 bg-white hover:bg-stone-100 text-neutral-800 rounded-full text-xs font-semibold flex items-center gap-1.5 transition border border-stone-200 shadow-sm cursor-pointer active:scale-95"
                  title="Share Storefront"
                >
                  <Share2 size={13} />
                  <span>Share Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTipModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-[#C85A32] text-white hover:from-amber-700 hover:to-[#b04a25] rounded-full text-xs font-bold flex items-center gap-1.5 transition shadow-sm hover:shadow active:scale-95 cursor-pointer"
                >
                  <Heart size={14} className="fill-white text-white" />
                  <span>{t("tip_weaver", "Support the Weaver (Tip)")}</span>
                </button>
                {isOwner && (
                  <Link
                    href="/studio"
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-neutral-800 rounded-full text-xs font-semibold flex items-center gap-1.5 transition border border-stone-200 shadow-sm"
                  >
                    <Camera size={13} />
                    <span>{t("customize_profile")}</span>
                  </Link>
                )}
              </div>
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
                  {t("shipping_destination")}
                </span>
                <p className="text-[11px] text-neutral-400">
                  {destination === "domestic"
                    ? t("domestic_shipping_desc")
                    : t("international_shipping_desc")}
                </p>
              </div>
            </div>

            <div className="inline-flex bg-stone-100 p-1 rounded-xl shadow-inner border border-stone-200/80 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setDestination("domestic");
                  setCurrency("INR");
                }}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  destination === "domestic"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <span>🇮🇳</span>
                <span>{t("domestic_shipping")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDestination("international");
                  setCurrency("USD");
                }}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  destination === "international"
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <span>🌍</span>
                <span>{t("international_shipping")}</span>
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
                const productTitle = getLocalizedProductTitle(product, activeLanguage);
                const productDesc = (destination === "international" && activeLanguage === "en" && product.export_description)
                  ? product.export_description
                  : getLocalizedProductDesc(product, activeLanguage);
                const usdPrice = getProductUsdPrice(product);
                const inrPrice = product.price || product.price_inr || 1500;

                return (
                  /* 3. The Individual Slide: MUST strictly be 100% of the viewport/container width */
                  <div key={product.id} className="w-full min-w-full flex-shrink-0 px-4 md:px-8">
                    
                    {/* 4. Inner Grid: Safely places Image on left, Text on right */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
                      
                      {/* Left Side: Locked Aspect Ratio Image with Next/Image optimization */}
                      <div className="relative w-full aspect-[4/5] md:aspect-[3/4] rounded-2xl overflow-hidden bg-stone-100 shadow-md">
                        {(() => {
                          const showcaseImage = productFailedImages[product.id]
                            ? getProductFallbackImage(product.ai_title_en || product.ai_title_local)
                            : getProductImage(product);
                          return (
                            <Image 
                              src={showcaseImage} 
                              alt={productTitle}
                              fill
                              priority
                              sizes="(max-width: 768px) 100vw, 50vw"
                              unoptimized={Boolean(showcaseImage.startsWith("http"))}
                              onError={() => setProductFailedImages((prev) => ({ ...prev, [product.id]: true }))}
                              className="object-cover"
                            />
                          );
                        })()}
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
                              {t("masterpiece_showcase")}
                            </p>
                            {destination === "international" && (
                              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                                {t("global_export_mode")}
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
                                <span className="text-xs text-stone-500 font-light">{t("worldwide_delivery")}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-2xl sm:text-3xl font-extrabold text-stone-900">
                                  ₹{inrPrice}
                                </span>
                                <span className="text-xs text-stone-500 font-light">{t("direct_from_weaver")}</span>
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
                              <Volume2 className="w-4 h-4 text-amber-700"/> {t("voice_of_weaver")}
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
            {t("explore_collection")}
          </h3>
          <div className="flex-1 h-px bg-stone-300"></div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 md:gap-x-6 md:gap-y-12">
          {gridProducts.map((product) => {
            const displayPrice = product.price || product.price_inr;
            const usdPrice = getProductUsdPrice(product);
            const stock = product.stock_quantity !== undefined && product.stock_quantity !== null
              ? product.stock_quantity
              : (product.in_stock === false ? 0 : 1);
            const isSoldOut = stock <= 0 || product.in_stock === false;
            const isLowStock = !isSoldOut && stock >= 1 && stock <= 3;
            const weavingDays = product.estimated_weaving_days;

            return (
              <div
                key={product.id}
                id={`product-${product.id}`}
                className="group flex flex-col justify-between bg-white/70 backdrop-blur-xs rounded-2xl p-2 sm:p-3 border border-stone-200/80 shadow-2xs hover:shadow-lg transition-all duration-300 w-full h-full relative"
              >
                {/* Image Container with strict 4/5 aspect ratio */}
                <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-stone-100 border border-stone-200/80 mb-2 sm:mb-3">
                  {(() => {
                    const heroImage = productFailedImages[product.id]
                      ? getProductFallbackImage(product.ai_title_en || product.ai_title_local)
                      : getProductImage(product);
                    return (
                      <Link
                        href={`/shop/${artisan.id}/${product.id}`}
                        onClick={() => saveScrollPosition()}
                        className="block relative w-full h-full"
                      >
                        <Image
                          src={heroImage}
                          alt={product.ai_title_en || product.ai_title_local || "Handloom Creation"}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          unoptimized={Boolean(heroImage.startsWith("http"))}
                          onError={() => setProductFailedImages((prev) => ({ ...prev, [product.id]: true }))}
                          className="object-cover object-top transition-transform duration-500 ease-in-out group-hover:scale-105"
                        />
                      </Link>
                    );
                  })()}

                  <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-white/95 backdrop-blur-sm text-neutral-900 text-xs sm:text-sm font-semibold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-sm z-10 border border-stone-200/60">
                    {destination === "international" ? `$${usdPrice.toFixed(2)} USD` : `₹${displayPrice || 1500}`}
                  </div>

                  {/* Share Product Button */}
                  <button
                    type="button"
                    onClick={() => handleShareProduct(product)}
                    className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-neutral-700 hover:text-neutral-900 flex items-center justify-center shadow transition z-10 cursor-pointer active:scale-95"
                    title="Share Creation"
                  >
                    <Share2 size={12} className="sm:w-[13px] sm:h-[13px]" />
                  </button>

                  {/* Sold Out / Low Stock Badges */}
                  {isSoldOut ? (
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
                      <span className="bg-neutral-900/95 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full shadow-md border border-white/20">
                        {t('sold_out', 'Sold Out')}
                      </span>
                    </div>
                  ) : isLowStock ? (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-rose-600/95 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow z-10 animate-pulse">
                      Only {stock} left!
                    </div>
                  ) : null}
                </div>

                {/* Details */}
                <div className="flex flex-col flex-grow space-y-1.5 sm:space-y-3 px-0.5 sm:px-1">
                  <div className="flex-grow">
                    <Link
                      href={`/shop/${artisan.id}/${product.id}`}
                      onClick={() => saveScrollPosition()}
                      className="hover:underline"
                    >
                      <h4 className={`text-neutral-900 text-xs sm:text-sm md:text-base font-bold mb-0.5 sm:mb-1 leading-snug line-clamp-2 ${playfair.className}`}>
                        {getLocalizedProductTitle(product, activeLanguage)}
                      </h4>
                    </Link>
                    <p className="text-neutral-500 text-[11px] sm:text-sm font-light leading-snug line-clamp-1 sm:line-clamp-2 hidden sm:block">
                      {destination === "international" && activeLanguage === "en" && product.export_description
                        ? product.export_description
                        : getLocalizedProductDesc(product, activeLanguage)}
                    </p>
                  </div>

                  <div className="hidden sm:flex flex-wrap gap-1.5 py-1">
                    {product.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2.5 py-0.5 border border-stone-200 text-neutral-500 text-xs font-medium rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Audio Player: Desktop Full Controls, Mobile Compact Listen Toggle */}
                  {product.audio_url && (
                    <div className="w-full pt-0.5 sm:pt-1">
                      {/* Desktop Full Audio Player */}
                      <div className="hidden md:block">
                        <span className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Volume2 size={12} className="text-amber-600" />
                          {t("voice_of_weaver")}
                        </span>
                        <audio 
                          controls 
                          preload="metadata"
                          src={product.audio_url} 
                          aria-label={`Voice note story of ${product.ai_title_en || 'Handloom Creation'} narrated by artisan ${artisan.full_name}`}
                          className="w-full h-8 rounded-full bg-stone-50 [&::-webkit-media-controls-panel]:bg-stone-50"
                        >
                          <source src={product.audio_url} type="audio/webm" />
                          <source src={product.audio_url} type="audio/mp4" />
                          <source src={product.audio_url} type="audio/mpeg" />
                          Your browser does not support audio.
                        </audio>
                      </div>

                      {/* Mobile Compact Listen Toggle */}
                      <div className="block md:hidden">
                        <button
                          type="button"
                          onClick={() => handleToggleMobileAudio(product.audio_url!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50/90 border border-amber-200/90 text-amber-900 text-[10px] font-semibold active:scale-95 transition"
                        >
                          {playingAudioUrl === product.audio_url ? (
                            <>
                              <Pause size={10} className="shrink-0" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play size={10} className="fill-amber-900 shrink-0" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Estimated Weaving Time Badge */}
                  {isSoldOut && weavingDays && weavingDays > 0 && (
                    <div className="text-[10px] sm:text-xs font-semibold text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-md px-1.5 py-0.5 flex items-center gap-1">
                      <Clock size={11} className="text-amber-700 shrink-0" />
                      <span className="truncate">Takes ~{weavingDays}d to weave</span>
                    </div>
                  )}

                  {/* Actions */}
                  {destination === "international" ? (
                    <div className="flex flex-col gap-1.5 sm:gap-2 mt-1 sm:mt-2 w-full">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                          <Globe size={11} className="text-emerald-600 sm:w-3 sm:h-3" /> {t("insured_export")}
                        </span>
                        <span className="text-[11px] sm:text-xs font-bold text-stone-900">${usdPrice.toFixed(2)} USD</span>
                      </div>
                      {isSoldOut ? (
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleBuy(product)}
                            className="w-full py-1.5 sm:py-2.5 px-2 rounded-lg text-xs sm:text-sm font-medium tracking-wide flex items-center justify-center gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-2xs active:scale-[0.98]"
                          >
                            <MessageCircle size={14} className="opacity-90 shrink-0" />
                            <span className="truncate">Order on WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            disabled
                            className="w-full py-1.5 px-2 bg-gray-200 text-gray-400 rounded-lg text-[10px] sm:text-xs font-semibold cursor-not-allowed pointer-events-none border border-gray-300 uppercase tracking-wider"
                          >
                            {t("sold_out", "Sold Out")}
                          </button>
                        </div>
                      ) : hasPayPal ? (
                        <div className="w-full relative z-10">
                          <PayPalButtons
                            style={{
                              layout: "vertical",
                              height: 36,
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
                                await handleRecordOrder(
                                  product,
                                  "paypal",
                                  "completed",
                                  usdPrice,
                                  "USD",
                                  orderId,
                                  details.payer?.name?.given_name || "Valued Global Patron"
                                );
                              }
                            }}
                            onError={(err) => {
                              console.error("PayPal Checkout Error:", err);
                              showToast("PayPal transaction error. Please try again.");
                            }}
                            onCancel={() => {
                              showToast("PayPal transaction cancelled.");
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full p-2 bg-amber-50/80 border border-amber-200/80 rounded-xl text-center space-y-1">
                          <p className="text-[10px] sm:text-[11px] font-semibold text-amber-900">
                            Global Checkout Pending
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (!hasWhatsApp) {
                                showToast("Artisan hasn't added their WhatsApp number yet.");
                                return;
                              }
                              handleBuy(product);
                            }}
                            className="w-full py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-neutral-800 transition active:scale-[0.99]"
                          >
                            <MessageCircle size={13} /> Inquire for Export
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 sm:gap-2 mt-1 sm:mt-2 w-full">
                      {/* WhatsApp Checkout (or Custom Order if Sold Out) */}
                      <button
                        onClick={() => {
                          if (!hasWhatsApp) {
                            showToast("Artisan hasn't added their WhatsApp number yet.");
                            return;
                          }
                          handleBuy(product);
                        }}
                        className={`w-full py-1.5 sm:py-2 px-2 rounded-lg text-[11px] sm:text-xs md:text-sm font-medium tracking-wide flex items-center justify-center gap-1.5 transition-colors shadow-2xs active:scale-[0.99] ${
                          hasWhatsApp
                            ? "bg-neutral-900 text-white hover:bg-neutral-800"
                            : "bg-stone-200 text-stone-500 hover:bg-stone-300"
                        }`}
                        title={isSoldOut ? "Order on WhatsApp" : "Buy on WhatsApp"}
                      >
                        <MessageCircle size={13} className="opacity-90 shrink-0" />
                        <span className="truncate">{isSoldOut ? "Order on WhatsApp" : t("buy_on_whatsapp")}</span>
                      </button>

                      {/* Instant UPI Pay Modal Trigger (Locked out when Sold Out) */}
                      <button
                        disabled={isSoldOut}
                        onClick={() => {
                          if (isSoldOut) return;
                          if (!hasPaymentConfigured) {
                            showToast("The artisan hasn't added their payment QR yet. Try again later!");
                            return;
                          }
                          setActiveUpiProduct(product);
                        }}
                        className={`w-full py-1.5 sm:py-2 px-2 rounded-lg text-[10px] sm:text-xs font-bold tracking-wide flex items-center justify-center gap-1 sm:gap-1.5 transition-colors shadow-2xs active:scale-[0.99] border ${
                          isSoldOut
                            ? "opacity-50 cursor-not-allowed pointer-events-none text-gray-500 bg-gray-200 border-gray-300"
                            : "bg-amber-50 text-amber-950 border-amber-300/80 hover:bg-amber-100/90"
                        }`}
                        title={isSoldOut ? "Sold Out" : t('instant_upi_pay')}
                      >
                        <Zap size={12} className={`shrink-0 ${isSoldOut ? "text-gray-400" : "text-amber-600 fill-amber-500"}`} />
                        <span className="truncate">{isSoldOut ? t('sold_out', 'Sold Out') : t('instant_upi_pay')}</span>
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
          {artisan.full_name}{t("loom_suffix")}
        </p>
        <p className="text-sm text-neutral-400 font-light font-sans">
          {t("powered_by")} <span className="text-neutral-600 font-medium">Vernacular AI</span>
        </p>
      </footer>
      </LanguageTransitionWrapper>

      {/* ── Zero-Commission UPI Checkout Modal ── */}
      {activeUpiProduct && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 flex flex-col items-center animate-in zoom-in-95 duration-200 relative">
            
            {/* Close Button */}
            <button
              onClick={() => setActiveUpiProduct(null)}
              aria-label="Close UPI QR Code modal"
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
              <p className="text-xs text-neutral-400 mt-0.5">{t("direct_payment_to")} {artisan.full_name}</p>
            </div>

            {/* QR Code Container */}
            <div 
              onClick={() => (hasRealQr || hasRealUpi) && openQrLightbox(upiUri, `${activeUpiProduct?.ai_title_en || "Creation"} • ₹${upiPrice}`)}
              title={hasPaymentConfigured ? "Click to view full-screen QR" : undefined}
              className={`p-3 bg-white border border-stone-200 rounded-2xl shadow-inner mb-4 flex items-center justify-center min-h-[190px] relative ${
                hasPaymentConfigured ? "cursor-pointer group hover:border-[#C85A32]/60 hover:shadow-md transition-all" : ""
              }`}
            >
              {hasRealQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artisan.qr_code_url!}
                  alt={`${artisan.full_name} Payment QR`}
                  className="w-44 h-44 object-contain rounded-xl group-hover:scale-[1.02] transition-transform duration-200"
                />
              ) : hasRealUpi ? (
                <QRCodeCanvas
                  value={upiUri}
                  size={180}
                  bgColor={"#ffffff"}
                  fgColor={"#171717"}
                  level={"M"}
                  className="group-hover:scale-[1.02] transition-transform duration-200"
                />
              ) : (
                <div className="text-center p-4">
                  <p className="text-xs text-stone-500">The artisan haven&apos;t added their payment QR yet. Try again later!</p>
                </div>
              )}
              {hasPaymentConfigured && (
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white rounded-md text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <span>🔍 Tap to expand</span>
                </div>
              )}
            </div>

            {/* UPI ID Display & Copy */}
            {hasRealUpi ? (
              <div className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between mb-4">
                <div className="min-w-0 pr-2">
                  <span className="block text-[10px] text-stone-400 uppercase font-bold tracking-wider">{t("artisan_upi_id", "Artisan UPI ID")}</span>
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
            ) : (
              <div className="w-full bg-amber-50/80 border border-amber-200/80 rounded-xl px-3.5 py-2 text-center mb-4">
                <span className="text-[11px] font-medium text-amber-900">
                  Scan the QR code above with any UPI app (GPay, PhonePe, Paytm)
                </span>
              </div>
            )}

            {/* Pay via UPI App Deep-link Button */}
            {upiUri ? (
              <div className="w-full space-y-2">
                <a
                  href={upiUri}
                  className="w-full py-3 bg-neutral-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition active:scale-[0.99] shadow-md text-center"
                >
                  <Zap size={16} className="text-amber-400 fill-amber-400 shrink-0" />
                  {t('pay_via_upi_app')}
                </a>
                <button
                  type="button"
                  disabled={isReportingUpi}
                  onClick={handleReportUpiPayment}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.99] shadow-sm text-center cursor-pointer"
                >
                  {isReportingUpi ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>I have completed the UPI payment</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleBuy(activeUpiProduct)}
                className="w-full py-3 bg-neutral-900 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition active:scale-[0.99] shadow-md text-center"
              >
                <MessageCircle size={16} className="shrink-0" />
                Confirm Order on WhatsApp
              </button>
            )}

            {/* Direct Tip Link */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setActiveUpiProduct(null);
                  setIsTipModalOpen(true);
                }}
                className="text-xs text-[#C85A32] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Heart size={12} className="fill-[#C85A32]" />
                <span>Want to support the weaver with a direct tip instead?</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Direct Patronage "Tip the Weaver" Modal ── */}
      {isTipModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 flex flex-col items-center animate-in zoom-in-95 duration-200 relative max-h-[92vh] overflow-y-auto z-[101]">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsTipModalOpen(false);
                setTipSuccess(null);
              }}
              aria-label="Close tip modal"
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition"
            >
              <X size={20} />
            </button>

            {tipSuccess ? (
              /* Success Celebration State */
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 mb-4 animate-bounce">
                  <Heart size={32} className="fill-rose-600" />
                </div>
                <h3 className={`text-2xl font-bold text-neutral-900 mb-1 ${playfair.className}`}>
                  Patronage Received!
                </h3>
                <p className="text-xs text-neutral-500 mb-4">
                  100% of your <span className="font-bold text-neutral-800">{tipSuccess.amount}</span> tip directly empowers {artisan.full_name} and sustains handloom heritage.
                </p>
                <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 mb-5">
                  <div className="flex justify-between py-1 border-b border-amber-200/60">
                    <span className="text-amber-700">Artisan:</span>
                    <span className="font-bold">{artisan.full_name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-amber-200/60">
                    <span className="text-amber-700">Method:</span>
                    <span className="font-bold">{tipSuccess.method}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-amber-700">Patron:</span>
                    <span className="font-bold">{patronName || "Anonymous Patron"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsTipModalOpen(false);
                    setTipSuccess(null);
                  }}
                  className="w-full py-3 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition"
                >
                  Close & Explore Creations
                </button>
              </div>
            ) : (
              /* Active Tip Form */
              <div className="w-full flex flex-col items-center">
                {/* Header Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3">
                  <Heart size={12} className="text-rose-600 fill-rose-500 shrink-0" />
                  <span>Direct Artisan Patronage</span>
                </div>

                <h3 className={`text-xl font-bold text-neutral-900 text-center mb-1 ${playfair.className}`}>
                  Support {artisan.full_name}
                </h3>
                <p className="text-xs text-neutral-500 text-center mb-4">
                  Empower rural craftsmanship with a zero-deduction tip.
                </p>

                {/* Currency Toggle */}
                <div className="w-full grid grid-cols-2 gap-1 bg-stone-100 p-1 rounded-xl mb-4 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setTipCurrency("INR");
                      setTipPreset(250);
                      setCustomTip("");
                    }}
                    className={`py-2 rounded-lg transition ${
                      tipCurrency === "INR"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    🇮🇳 UPI (INR)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTipCurrency("USD");
                      setTipPreset(5);
                      setCustomTip("");
                    }}
                    className={`py-2 rounded-lg transition ${
                      tipCurrency === "USD"
                        ? "bg-white text-neutral-900 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    🌍 PayPal (USD)
                  </button>
                </div>

                {/* Preset Tip Buttons */}
                <div className="w-full grid grid-cols-4 gap-2 mb-3">
                  {(tipCurrency === "INR" ? [100, 250, 500, 1000] : [2, 5, 10, 25]).map((amt) => {
                    const isSelected = !customTip && tipPreset === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setTipPreset(amt);
                          setCustomTip("");
                        }}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          isSelected
                            ? "bg-[#C85A32] text-white border-[#C85A32] shadow-sm"
                            : "bg-white text-neutral-700 border-stone-200 hover:border-stone-400 hover:bg-stone-50"
                        }`}
                      >
                        {tipCurrency === "INR" ? `₹${amt}` : `$${amt}`}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Tip Input */}
                <div className="w-full mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-500">
                      Or Enter Custom Amount ({tipCurrency})
                    </label>
                    {tipCurrency === "INR" && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                        Minimum tip: ₹10
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={tipCurrency === "INR" ? 10 : 1}
                    placeholder={`e.g. ${tipCurrency === "INR" ? "150 (min ₹10)" : "15"}`}
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#C85A32]"
                  />
                  {tipCurrency === "INR" && customTip && !isNaN(Number(customTip)) && Number(customTip) > 0 && Number(customTip) < 10 && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1">
                      Minimum tip is ₹10
                    </p>
                  )}
                </div>

                {/* Patron Name Input */}
                <div className="w-full mb-4">
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma (or leave blank)"
                    value={patronName}
                    onChange={(e) => setPatronName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#C85A32]"
                  />
                </div>

                {/* Payment Action depending on Currency */}
                {tipCurrency === "INR" ? (
                  !hasPaymentConfigured ? (
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                        <AlertCircle size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-amber-900 mb-1">
                        Payment QR Code Pending
                      </h4>
                      <p className="text-xs text-amber-800 leading-relaxed mb-3">
                        The artisan haven&apos;t added their payment QR yet. Try again later!
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          showToast("The artisan haven't added their qr yet try again later");
                          setIsTipModalOpen(false);
                        }}
                        className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition"
                      >
                        Got it, Try Again Later
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center">
                      {/* UPI QR Container: Real QR Image or Dynamic Canvas */}
                      <div
                        onClick={() => openQrLightbox(tipUpiUri, `Patronage Tip • ₹${effectiveTipAmount}`)}
                        title="Click to view full-screen QR"
                        className="p-3 bg-white border-2 border-stone-200 hover:border-[#C85A32]/60 rounded-2xl shadow-inner mb-3 flex items-center justify-center min-h-[170px] cursor-pointer group transition-all duration-200 hover:shadow-md relative"
                      >
                        {hasRealQr ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artisan.qr_code_url!}
                            alt={`${artisan.full_name} Payment QR`}
                            className="w-40 h-40 object-contain rounded-xl group-hover:scale-[1.02] transition-transform duration-200"
                          />
                        ) : hasRealUpi ? (
                          <QRCodeCanvas
                            value={tipUpiUri}
                            size={160}
                            bgColor={"#ffffff"}
                            fgColor={"#171717"}
                            level={"M"}
                            className="group-hover:scale-[1.02] transition-transform duration-200"
                          />
                        ) : null}
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white rounded-md text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <span>🔍 Tap to expand</span>
                        </div>
                      </div>

                      {/* Artisan UPI ID Display & Copy */}
                      {hasRealUpi ? (
                        <div className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 flex items-center justify-between mb-3 text-left">
                          <div className="min-w-0 pr-2">
                            <span className="block text-[9px] text-stone-400 uppercase font-bold tracking-wider">{t("artisan_upi_id", "Artisan UPI ID")}</span>
                            <span className="text-xs font-semibold text-stone-800 truncate block font-mono">{upiId}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyUpi(upiId)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition shrink-0"
                            title="Copy UPI ID"
                          >
                            {copiedUpi ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <div className="w-full bg-amber-50/70 border border-amber-200/60 rounded-xl px-3 py-1.5 text-center mb-3">
                          <span className="text-[10px] font-medium text-amber-900">
                            Scan with PhonePe, Google Pay, or Paytm
                          </span>
                        </div>
                      )}

                      <p className="text-[11px] text-neutral-500 mb-3 text-center">
                        Scan or tap below to tip <span className="font-bold text-neutral-900">₹{effectiveTipAmount}</span> directly to {artisan.full_name}
                      </p>

                      {/* Pay via UPI App button */}
                      {upiUri ? (
                        <a
                          href={tipUpiUri}
                          className="w-full py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition active:scale-[0.99] shadow-sm mb-2 text-center"
                        >
                          <Zap size={14} className="text-amber-400 fill-amber-400" />
                          Pay ₹{effectiveTipAmount} via UPI App
                        </a>
                      ) : null}

                      {/* Confirm Sent Tip Button with Disabled/Loading State */}
                      <button
                        type="button"
                        disabled={isRecordingTip}
                        onClick={() => handleRecordTip("upi")}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.99] shadow-sm cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isRecordingTip ? (
                          <>
                            <Loader2 size={14} className="animate-spin text-white" />
                            <span>Recording Tip...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} strokeWidth={2.5} />
                            <span>I&apos;ve Sent This Tip (Record)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                ) : (
                  <div className="w-full flex flex-col items-center">
                    {hasPayPal ? (
                      <>
                        <p className="text-[11px] text-neutral-500 mb-3 text-center">
                          Tip <span className="font-bold text-neutral-900">${effectiveTipAmount.toFixed(2)} USD</span> securely with PayPal
                        </p>
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
                                application_context: {
                                  shipping_preference: "NO_SHIPPING",
                                },
                                purchase_units: [
                                  {
                                    description: `Direct Patronage Tip for ${artisan.full_name}`,
                                    amount: {
                                      currency_code: "USD",
                                      value: effectiveTipAmount.toFixed(2),
                                    },
                                  },
                                ],
                              });
                            }}
                            onApprove={async (data, actions) => {
                              if (actions.order) {
                                const details = await actions.order.capture();
                                await handleRecordTip("paypal", details.id || data.orderID);
                              }
                            }}
                            onError={(err) => {
                              console.error("PayPal Tip Error:", err);
                              showToast("PayPal tip error. Please try again.");
                            }}
                            onCancel={() => {
                              showToast("PayPal tip was cancelled.");
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="w-full p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-center space-y-2">
                        <p className="text-xs font-bold text-amber-900">PayPal Tip Not Available</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          This artisan hasn&apos;t added their PayPal account yet. You can support them via Indian UPI or reach out directly on WhatsApp.
                        </p>
                        <button
                          type="button"
                          onClick={() => setTipCurrency("INR")}
                          className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition"
                        >
                          Switch to UPI Tip (₹)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── International PayPal Order Success Modal ── */}
      {paypalSuccessOrder && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 relative">
            {/* Close Button */}
            <button
              onClick={() => setPaypalSuccessOrder(null)}
              aria-label="Close Order Confirmation modal"
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
              <span>{t("export_order_confirmed")}</span>
            </div>

            <h3 className={`text-2xl text-stone-900 font-bold mb-2 ${playfair.className}`}>
              {t("order_thank_you")}
            </h3>

            <p className="text-xs text-stone-600 mb-6 font-light leading-relaxed">
              {t("order_success_desc")}
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

      {/* ── Full-Screen Interactive QR Code Lightbox Overlay ── */}
      {isQrLightboxOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setIsQrLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged Payment QR Code Lightbox"
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 flex flex-col items-center max-w-lg w-full relative animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Right "X" Close Button */}
            <button
              type="button"
              onClick={() => setIsQrLightboxOpen(false)}
              aria-label="Close QR lightbox"
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-full transition cursor-pointer"
            >
              <X size={22} />
            </button>

            {/* Lightbox Badge & Header */}
            <div className="text-center mb-5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block mb-2">
                {lightboxSubtitle || `Direct UPI • ${artisan.full_name}`}
              </span>
              <h3 className={`text-xl sm:text-2xl font-bold text-neutral-900 ${playfair.className}`}>
                Scan &amp; Pay via UPI
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                Scan using any UPI app on your mobile phone (GPay, PhonePe, Paytm, BHIM)
              </p>
            </div>

            {/* High-Resolution QR Display (Large 400x400) */}
            <div className="p-4 sm:p-6 bg-white border-2 border-stone-200 rounded-3xl shadow-inner flex items-center justify-center mb-4">
              {hasRealQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artisan.qr_code_url!}
                  alt={`${artisan.full_name} Payment QR Code`}
                  className="w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] object-contain rounded-2xl"
                />
              ) : (
                <QRCodeCanvas
                  value={lightboxUri || tipUpiUri || upiUri}
                  size={380}
                  bgColor={"#ffffff"}
                  fgColor={"#171717"}
                  level={"H"}
                  includeMargin={true}
                  className="w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] rounded-xl"
                />
              )}
            </div>

            {/* Artisan UPI ID Pill & Copy */}
            {hasRealUpi && (
              <div className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs mb-4">
                <div className="min-w-0 pr-3">
                  <span className="block text-[9px] uppercase font-bold text-stone-400 tracking-wider">UPI ID</span>
                  <span className="font-mono font-bold text-stone-800 truncate block text-xs sm:text-sm">{upiId}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyUpi(upiId)}
                  className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg font-semibold text-stone-700 flex items-center gap-1.5 transition text-xs shrink-0 cursor-pointer"
                >
                  {copiedUpi ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedUpi ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}

            {/* Close / Done Button */}
            <button
              type="button"
              onClick={() => setIsQrLightboxOpen(false)}
              className="w-full py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
            >
              Done Scanning
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
