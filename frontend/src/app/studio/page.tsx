/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, CheckCircle, Check, Share2, Loader2, Sparkles,
  ImagePlus, AudioLines, UploadCloud, AlertCircle, X, Plus, LogOut, User, Copy, Download, ShoppingBag,
  Trash2, RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { QRCodeCanvas } from "qrcode.react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { Product } from "@/lib/api";
import { useArtisan } from "@/context/ArtisanContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function parseNumericSuggestedPrice(range?: string | null): number {
  if (!range) return 1500;
  const match = range.match(/\d[\d,]*/);
  if (!match) return 1500;
  const val = parseInt(match[0].replace(/,/g, ""), 10);
  return isNaN(val) || val <= 0 ? 1500 : val;
}

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// ─── Types ──────────────────────────────────────────────────────────────────

interface GeneratedProduct {
  product_id: string;
  image_url: string;
  ai_title_en: string;
  ai_title_local: string;
  ai_desc_en: string;
  ai_desc_local: string;
  price_inr: number | null;
  price_usd?: number | null;
  suggested_price_range: string | null;
  suggested_usd_price?: number | null;
  export_description?: string | null;
  tags: string[];
  whatsapp_link: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const { artisanId, profileName, profilePhone, whatsappNumber, upiId, paypalEmail, userRole, saveProfile, logout, isLoading: authLoading } = useArtisan();
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && artisanId && userRole === "customer") {
      router.push("/shop");
    }
  }, [authLoading, artisanId, userRole, router]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Local state for the input fields in the modal
  const [localName, setLocalName] = useState("");
  const [localWhatsapp, setLocalWhatsapp] = useState("");
  const [localUpi, setLocalUpi] = useState("");
  const [localPaypal, setLocalPaypal] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Studio Navigation Tabs & Catalog State
  const [activeTab, setActiveTab] = useState<"craft" | "catalog">("craft");
  const [products, setProducts] = useState<Product[]>([]);
  const inventory = products;
  const setInventory = setProducts;
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [isUpdatingPrice, setIsUpdatingPrice] = useState<Record<string, boolean>>({});
  const [isTogglingStock, setIsTogglingStock] = useState<Record<string, boolean>>({});
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  // Sync user state from Supabase Auth & ArtisanContext
  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser({ id: session.user.id, email: session.user.email });
        } else if (artisanId && isMounted) {
          setUser({ id: artisanId });
        }
      } catch (e) {
        console.warn("Failed to get session user:", e);
      }
    }
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: unknown, session: Session | null) => {
      if (session?.user && isMounted) {
        setUser({ id: session.user.id, email: session.user.email });
      } else if (!session && isMounted) {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [artisanId, supabase]);

  useEffect(() => {
    if (artisanId && (!user || user.id !== artisanId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser({ id: artisanId });
    }
  }, [artisanId, user]);

  // Generated results price override states
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});
  const [isSavingProductPrice, setIsSavingProductPrice] = useState<Record<string, boolean>>({});
  const [savedProductPrice, setSavedProductPrice] = useState<Record<string, boolean>>({});
  const [isPublishingAll, setIsPublishingAll] = useState(false);

  // Sync modal inputs when opened
  useEffect(() => {
    if (isProfileOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalName(profileName || "");
      const rawW = whatsappNumber || profilePhone || "";
      const safeWhatsapp = rawW.toLowerCase().includes("unknown") ? "" : rawW;
      setLocalWhatsapp(safeWhatsapp);
      setLocalUpi(upiId || "");
      setLocalPaypal(paypalEmail || "");
    }
  }, [isProfileOpen, profileName, whatsappNumber, profilePhone, upiId, paypalEmail]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const targetId = user?.id || artisanId;
      const cleanW = localWhatsapp.trim();
      const safeWhatsapp = cleanW.toLowerCase().includes("unknown") ? "" : cleanW;

      if (targetId) {
        const payload: {
          full_name: string;
          whatsapp_number?: string;
          upi_id?: string;
          paypal_email?: string;
        } = {
          full_name: localName.trim(),
          whatsapp_number: safeWhatsapp,
          upi_id: localUpi.trim(),
          paypal_email: localPaypal.trim(),
        };

        const { error } = await supabase
          .from("artisans")
          .update(payload)
          .eq("id", targetId);

        if (error) {
          console.warn("Direct Supabase update error:", error);
        }
      }

      const success = await saveProfile(localName.trim(), safeWhatsapp, localUpi.trim(), localPaypal.trim());
      if (success) {
        router.refresh();
        showToast("Profile updated");
        setIsProfileOpen(false);
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      showToast("Failed to save profile");
    } finally {
      setIsSavingProfile(false); // CRITICAL FIX
    }
  };

  const handleSignOut = async () => {
    await logout();
  };

  const fetchMyCatalog = useCallback(async () => {
    const targetUserId = user?.id || artisanId;
    if (!targetUserId) {
      setIsLoadingInventory(false);
      return;
    }

    setIsLoadingInventory(true);
    try {
      // 1. Direct Supabase query strictly matching the logged-in artisan
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("artisan_id", targetUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Catalog Fetch Error:", error);
      }

      // If Supabase returned rows, populate the catalog state
      if (!error && data && data.length > 0) {
        setProducts(data);
        const drafts: Record<string, string> = {};
        data.forEach((p: Product) => {
          drafts[p.id] = String(p.price ?? p.price_inr ?? "");
        });
        setPriceDrafts(drafts);
      } else {
        // 2. Service-role backed API fallback (ensures catalog loads even if RLS blocks anon SELECT)
        const fallbackRes = await fetch(`${API_BASE}/api/v1/products/shop/${targetUserId}`, {
          cache: "no-store",
        });
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          const prods = json.products || [];
          setProducts(prods);
          const drafts: Record<string, string> = {};
          prods.forEach((p: Product) => {
            drafts[p.id] = String(p.price ?? p.price_inr ?? "");
          });
          setPriceDrafts(drafts);
        } else {
          setProducts(data || []);
        }
      }
    } catch (err) {
      console.error("Failed to load catalog:", err);
      try {
        const fallbackRes = await fetch(`${API_BASE}/api/v1/products/shop/${targetUserId}`, {
          cache: "no-store",
        });
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          const prods = json.products || [];
          setProducts(prods);
        }
      } catch (fallbackErr) {
        console.error("Fallback error:", fallbackErr);
      }
    } finally {
      setIsLoadingInventory(false); // CRITICAL FIX
    }
  }, [user?.id, artisanId, supabase]);

  const fetchInventory = fetchMyCatalog;

  // STRICT GUARD: Re-run the effect the moment user.id or artisanId populates
  useEffect(() => {
    if (!user?.id && !artisanId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMyCatalog();
  }, [user?.id, artisanId, fetchMyCatalog]);

  // Save single generated product price override
  const handleSaveProductPrice = async (product: GeneratedProduct) => {
    setIsSavingProductPrice((prev) => ({ ...prev, [product.product_id]: true }));
    try {
      const rawVal = customPrices[product.product_id]?.trim();
      let finalPrice = rawVal ? parseInt(rawVal, 10) : null;
      if (!finalPrice || isNaN(finalPrice) || finalPrice <= 0) {
        finalPrice = parseNumericSuggestedPrice(product.suggested_price_range);
      }

      const finalUsd = product.price_usd || product.suggested_usd_price || Math.round(Math.max(25, finalPrice / 75));

      // 1. Fire Supabase UPDATE query on both price, price_inr, and price_usd
      const { error: dbErr } = await supabase
        .from("products")
        .update({ price: finalPrice, price_inr: finalPrice, price_usd: finalUsd })
        .eq("id", product.product_id);

      // 2. Also patch backend API to guarantee sync
      try {
        await fetch(`/api/v1/products/${product.product_id}/price`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price: finalPrice, price_inr: finalPrice, price_usd: finalUsd }),
        });
      } catch (e) {
        console.warn("Backend price patch notice:", e);
      }

      if (!dbErr) {
        setSavedProductPrice((prev) => ({ ...prev, [product.product_id]: true }));
        router.refresh();
        showToast(`Price updated to ₹${finalPrice} ($${finalUsd})`);
        fetchInventory();
      }
    } catch (err) {
      console.error("Failed to update product price:", err);
    } finally {
      setIsSavingProductPrice((prev) => ({ ...prev, [product.product_id]: false }));
    }
  };

  // Confirm and Publish All generated products to Loom / My Catalog
  const handleSaveAndPublishAll = async () => {
    if (!results || results.length === 0) return;
    setIsPublishingAll(true);
    try {
      for (const product of results) {
        const rawVal = customPrices[product.product_id]?.trim();
        let finalPrice = rawVal ? parseInt(rawVal, 10) : null;
        if (!finalPrice || isNaN(finalPrice) || finalPrice <= 0) {
          finalPrice = parseNumericSuggestedPrice(product.suggested_price_range);
        }
        const finalUsd = product.price_usd || product.suggested_usd_price || Math.round(Math.max(25, finalPrice / 75));

        // Direct Supabase UPDATE
        await supabase
          .from("products")
          .update({ price: finalPrice, price_inr: finalPrice, price_usd: finalUsd, in_stock: true })
          .eq("id", product.product_id);

        try {
          await fetch(`/api/v1/products/${product.product_id}/price`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ price: finalPrice, price_inr: finalPrice, price_usd: finalUsd }),
          });
        } catch {
          // ignore fallback notice
        }
      }

      showToast("Creations published to My Catalog!");
      await fetchInventory();
      router.refresh();
      setResults(null);
      setImages([]);
      setImagePreviews([]);
      setAudioBlob(null);
      setActiveTab("catalog");
    } catch (err) {
      console.error("Failed to publish catalog:", err);
      showToast("Error publishing catalog");
    } finally {
      setIsPublishingAll(false);
    }
  };

  const handleUpdatePrice = async (productId: string) => {
    const val = parseInt(priceDrafts[productId] || "0", 10);
    if (isNaN(val) || val <= 0) return;
    setIsUpdatingPrice((prev) => ({ ...prev, [productId]: true }));
    try {
      const { error } = await supabase
        .from("products")
        .update({ price: val, price_inr: val })
        .eq("id", productId);
      if (!error) {
        setInventory((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, price: val, price_inr: val } : p))
        );
        router.refresh();
        showToast(t("price_updated"));
      }
    } catch (err) {
      console.error("Failed to update price:", err);
    } finally {
      setIsUpdatingPrice((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleToggleStock = async (product: Product) => {
    const newStock = product.in_stock === false;
    setIsTogglingStock((prev) => ({ ...prev, [product.id]: true }));
    try {
      const { error } = await supabase
        .from("products")
        .update({ in_stock: newStock })
        .eq("id", product.id);
      if (!error) {
        setInventory((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, in_stock: newStock } : p))
        );
        router.refresh();
        showToast(newStock ? t("in_stock") : t("sold_out"));
      }
    } catch (err) {
      console.error("Failed to toggle stock:", err);
    } finally {
      setIsTogglingStock((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  // Triggered when clicking the trash icon
  const initiateDelete = (productId: string) => {
    setProductToDelete(productId);
  };

  // Triggered when clicking "Delete" inside the custom modal
  const confirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete);

      if (error) throw error;

      // Remove from UI state
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete));
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[productToDelete];
        return next;
      });
      router.refresh(); // Forces Next.js to fetch fresh data for all routes in the background
      showToast("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      showToast("Failed to delete product");
    } finally {
      setIsDeleting(false);
      setProductToDelete(null); // Close the modal
    }
  };
  // Images — multiple
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Audio
  const [audioMode, setAudioMode] = useState<"record" | "upload">("record");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generation
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedProduct[] | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Image Handlers ─────────────────────────────────────────────────────────

  const handleImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const newImages = [...images, ...selected].slice(0, 8); // max 8 images
    setImages(newImages);
    setImagePreviews(newImages.map((f) => URL.createObjectURL(f)));
    setErrorMsg(null);
    // Reset input so same file can be added again if needed
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    setImagePreviews(next.map((f) => URL.createObjectURL(f)));
  };

  // ── Audio Handlers ─────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
      recorder.start();
      setIsRecording(true);
      setAudioBlob(null);
      setRecordingTime(0);
      setErrorMsg(null);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      alert("Microphone access denied. Please allow microphone permissions in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { setAudioBlob(e.target.files[0]); setErrorMsg(null); }
  };

  // ── Generate ───────────────────────────────────────────────────────────────

  const generate = async () => {
    if (!images.length || !audioBlob) return;
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingMsg(`Uploading ${images.length} image${images.length > 1 ? "s" : ""} & running AI...`);

    let currentArtisanId = artisanId;
    if (!currentArtisanId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        currentArtisanId = user?.id || null;
      } catch (err) {
        console.warn("Auth check in generate:", err);
      }
    }

    if (!currentArtisanId) {
      router.push("/login");
      return;
    }

    const formData = new FormData();
    formData.append("artisan_id", currentArtisanId);
    images.forEach((img) => formData.append("images", img));
    const audioMime = audioBlob.type || "audio/webm";
    const audioFilename = (audioBlob as File).name || (audioMime.includes("mp4") ? "recording.mp4" : "recording.webm");
    formData.append("audio", audioBlob, audioFilename);

    try {
      const res = await fetch("/api/v1/products/generate", { method: "POST", body: formData });
      const data = await res.json();
      if (data.status === "success") {
        setResults(data.products);
        const initialPrices: Record<string, string> = {};
        data.products.forEach((p: GeneratedProduct) => {
          const fallback = p.price_inr || parseNumericSuggestedPrice(p.suggested_price_range);
          initialPrices[p.product_id] = String(fallback);
        });
        setCustomPrices(initialPrices);
        fetchInventory();
      } else {
        setErrorMsg(data.detail || "Generation failed on the server.");
      }
    } catch (err) {
      console.error("API error:", err);
      setErrorMsg("Failed to connect to the backend. Is it running?");
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────

  const handleShare = async (product: GeneratedProduct, imageFile?: File) => {
    setSharingId(product.product_id);
    const storeUrl = `${window.location.origin}/shop/${artisanId}`;
    const text = [
      `🛍️ *${product.ai_title_local}*`,
      `*Price:* ₹${product.price_inr ?? "N/A"}`,
      "",
      "View my full collection here:",
      storeUrl
    ].join("\n");

    // Try native Web Share API (mobile)
    if (navigator.canShare && imageFile) {
      try {
        if (navigator.canShare({ files: [imageFile], text })) {
          await navigator.share({ files: [imageFile], text, title: product.ai_title_en });
          setSharingId(null);
          showToast("Shared successfully!");
          return;
        }
      } catch {
        // User cancelled or not supported — fall through to WhatsApp
      }
    }

    // Fallback: WhatsApp deep link
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setSharingId(null);
    showToast("Opening WhatsApp...");
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const reset = () => {
    setImages([]); setImagePreviews([]); setAudioBlob(null);
    setResults(null); setErrorMsg(null); setRecordingTime(0);
  };

  const canGenerate = images.length > 0 && !!audioBlob && !isLoading;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // Wait for auth to load or if the user is a customer (they will be redirected by the useEffect)
  if (authLoading || (artisanId && userRole === "customer")) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-6 font-sans">
      <main className="w-full min-h-screen md:min-h-0 md:h-[880px] md:max-w-[410px] bg-white md:rounded-[2.5rem] md:shadow-2xl flex flex-col relative overflow-hidden border-0 md:border-[8px] md:border-slate-800">

        {/* ── Header ── */}
        <header className="px-5 pt-8 pb-4 flex items-center justify-between border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex-1 min-w-0 mr-3">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight truncate">
              {t('header_title')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {artisanId ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-neutral-800 font-bold font-serif hover:bg-stone-300 transition"
                  title={t('profile_settings')}
                >
                  {profileName ? profileName.charAt(0).toUpperCase() : <User size={16} />}
                </button>
              </div>
            ) : (
              <button onClick={() => router.push('/login')} className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition">
                {t('sign_in')}
              </button>
            )}
          </div>
        </header>

        {/* ── Segmented Navigation Control ── */}
        <div className="px-5 pt-3 pb-2 bg-white border-b border-slate-100 z-10 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("craft")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "craft"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Sparkles size={14} className={activeTab === "craft" ? "text-amber-500" : ""} />
              {t('tab_add_craft')}
            </button>
            <button
              onClick={() => {
                setActiveTab("catalog");
                fetchInventory();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "catalog"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <ShoppingBag size={14} className={activeTab === "catalog" ? "text-indigo-600" : ""} />
              {t('tab_my_catalog')}
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-36">
          {activeTab === "catalog" ? (
            /* ════════════════════ INVENTORY / MY CATALOG VIEW ════════════════════ */
            <div className="space-y-4 pb-12">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {t('tab_my_catalog')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {inventory.length} {inventory.length === 1 ? "Creation" : t('creations_count')} listed
                  </p>
                </div>
                <button
                  onClick={fetchInventory}
                  disabled={isLoadingInventory}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 transition active:scale-95"
                >
                  <RefreshCw size={12} className={isLoadingInventory ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              {isLoadingInventory && inventory.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="animate-spin text-slate-400" size={28} />
                  <p className="text-xs font-medium">Loading catalog...</p>
                </div>
              ) : inventory.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center flex flex-col items-center gap-3 mt-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                    <ShoppingBag size={22} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">{t('no_products_artisan')}</p>
                  <button
                    onClick={() => setActiveTab("craft")}
                    className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles size={14} className="text-amber-400" />
                    {t('tab_add_craft')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {inventory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-sm hover:shadow-md transition flex flex-col gap-3"
                    >
                      {/* Top row: Image + Info + Delete */}
                      <div className="flex gap-3 items-start">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-100 bg-slate-100">
                          <img
                            src={item.image_url}
                            alt={item.ai_title_en}
                            className="w-full h-full object-cover object-top"
                          />
                          {item.in_stock === false && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                              {t('sold_out')}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">
                            {item.ai_title_local || item.ai_title_en}
                          </h3>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {item.ai_title_en}
                          </p>
                          {item.suggested_price_range && (
                            <span className="inline-block mt-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md font-medium truncate max-w-full">
                              {item.suggested_price_range}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => initiateDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title={t('delete_product')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Bottom row: Inline Price Editor & Stock Toggle */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500">₹</span>
                          <input
                            type="number"
                            value={priceDrafts[item.id] ?? ""}
                            onChange={(e) =>
                              setPriceDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            placeholder="Price"
                            className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                          <button
                            onClick={() => handleUpdatePrice(item.id)}
                            disabled={isUpdatingPrice[item.id]}
                            className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition active:scale-95 disabled:opacity-60"
                          >
                            {isUpdatingPrice[item.id] ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </button>
                        </div>

                        <button
                          onClick={() => handleToggleStock(item)}
                          disabled={isTogglingStock[item.id]}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                            item.in_stock === false
                              ? "bg-stone-100 text-stone-600 border border-stone-300 hover:bg-stone-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          {isTogglingStock[item.id] ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : item.in_stock === false ? (
                            <>● {t('sold_out')}</>
                          ) : (
                            <>✓ {t('in_stock')}</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !results ? (

            /* ════════════════════ UPLOAD VIEW ════════════════════ */
            <div className="space-y-7">

              {/* Step 1 — Multi Image */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <h2 className="text-base font-bold text-slate-800">{t('product_photos')}</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{images.length}/8</span>
                </div>

                {/* Thumbnail gallery + add button */}
                {imagePreviews.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        <img src={src} alt={`img-${i}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {images.length < 8 && (
                      <label htmlFor="camera-input" className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer transition">
                        <Plus size={22} />
                        <span className="text-[10px] mt-1 font-medium">Add</span>
                      </label>
                    )}
                  </div>
                ) : (
                  <label
                    htmlFor="camera-input"
                    className="block w-full p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
                  >
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-emerald-600">
                        <ImagePlus size={30} strokeWidth={1.5} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm">{t('upload_photos')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t('up_to_8')}</p>
                      </div>
                    </div>
                  </label>
                )}
                <input
                  id="camera-input"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  multiple
                  onChange={handleImagesSelected}
                  className="hidden"
                />
              </section>

              {/* Step 2 — Voice */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">2</div>
                  <h2 className="text-base font-bold text-slate-800">{t('voice_desc')}</h2>
                </div>

                {/* Tab toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 mb-3">
                  {(["record", "upload"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAudioMode(mode)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors capitalize ${audioMode === mode ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {mode === "record" ? t('record_live') : t('upload_file')}
                    </button>
                  ))}
                </div>

                <div className={`rounded-2xl p-5 border-2 transition-all ${isRecording ? "border-red-400 bg-red-50" : audioBlob ? "border-emerald-400 bg-emerald-50" : "border-slate-100 bg-white shadow-sm"}`}>
                  {audioMode === "record" ? (
                    <div className="flex flex-col items-center gap-3">
                      <button
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onMouseLeave={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className={`w-18 h-18 w-20 h-20 rounded-full flex items-center justify-center text-white transition-all select-none shadow-xl ${isRecording ? "bg-red-500 scale-95 shadow-red-400/50" : audioBlob ? "bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-700"}`}
                      >
                        {isRecording ? <AudioLines size={34} className="animate-pulse" /> : <Mic size={34} />}
                      </button>
                      <p className={`text-sm font-semibold ${isRecording ? "text-red-600 animate-pulse" : audioBlob ? "text-emerald-700" : "text-slate-500"}`}>
                        {isRecording ? `Recording… ${recordingTime}s` : audioBlob ? `✓ ${t('audio_selected')}` : t('mic_prompt')}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <input type="file" accept="audio/mp3,audio/wav,audio/m4a,audio/webm,audio/ogg" onChange={handleAudioUpload} className="hidden" id="audio-upload" />
                      <label htmlFor="audio-upload" className="block cursor-pointer">
                        {audioBlob ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><CheckCircle size={26} /></div>
                            <p className="text-emerald-700 font-bold text-sm">{t('audio_selected')}</p>
                            <p className="text-xs text-slate-400 truncate max-w-xs">{(audioBlob as File).name}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-indigo-600"><UploadCloud size={26} /></div>
                            <p className="font-bold text-slate-700 text-sm">{t('browse_audio')}</p>
                            <p className="text-xs text-slate-400">MP3 · WAV · M4A · WebM</p>
                          </div>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </section>
            </div>

          ) : (

            /* ════════════════════ RESULTS VIEW ════════════════════ */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {results.length} Listing{results.length > 1 ? "s" : ""} Generated
                </h2>
                <button onClick={reset} className="text-xs text-slate-500 hover:text-red-500 font-semibold transition">{t('reset')}</button>
              </div>

              {results.map((product, i) => (
                <div key={product.product_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Product image */}
                  <div className="relative aspect-video bg-slate-100">
                    <img
                      src={product.image_url || imagePreviews[i]}
                      alt={product.ai_title_en}
                      className="w-full h-full object-cover"
                    />
                    {product.price_inr && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full font-bold text-sm">
                        ₹{product.price_inr}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{product.ai_title_local}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{product.ai_title_en}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {product.tags.map((tag, j) => (
                        <span key={j} className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {product.ai_desc_local}
                    </p>

                    {product.suggested_price_range && (
                      <div className="bg-amber-50 border border-amber-100 text-amber-800 p-3 rounded-xl flex items-start gap-2 text-xs">
                        <Sparkles size={14} className="mt-0.5 shrink-0 text-amber-600" />
                        <div>
                          <strong className="block font-bold text-amber-900 mb-0.5">AI Suggestion</strong>
                          Similar handloom items sell for {product.suggested_price_range}.
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">Final Selling Price (₹)</label>
                        {savedProductPrice[product.product_id] && (
                          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                            <Check size={12} /> Saved
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                          <input 
                            type="number" 
                            value={customPrices[product.product_id] ?? (product.price_inr || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomPrices((prev) => ({ ...prev, [product.product_id]: val }));
                              setSavedProductPrice((prev) => ({ ...prev, [product.product_id]: false }));
                            }}
                            onBlur={() => handleSaveProductPrice(product)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                            placeholder="e.g. 2500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveProductPrice(product)}
                          disabled={isSavingProductPrice[product.product_id]}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 shrink-0"
                        >
                          {isSavingProductPrice[product.product_id] ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : savedProductPrice[product.product_id] ? (
                            <>
                              <Check size={13} className="text-emerald-400" />
                              <span>Saved</span>
                            </>
                          ) : (
                            <span>Save</span>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Suggested: {product.suggested_price_range || "₹1500 - ₹2500"} (blank defaults to suggestion or 1500)
                      </p>
                    </div>

                    {/* Share button */}
                    <button
                      onClick={() => handleShare(product, images[i])}
                      disabled={sharingId === product.product_id}
                      className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/30 hover:bg-[#20bd5a] hover:scale-[1.02] transition-all disabled:opacity-60"
                    >
                      {sharingId === product.product_id ? (
                        <><Loader2 className="animate-spin" size={18} /> Opening...</>
                      ) : (
                        <><Share2 size={18} /> {t('share_whatsapp')}</>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Master Action Banner: Publish All to My Catalog */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleSaveAndPublishAll}
                  disabled={isPublishingAll}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-60"
                >
                  {isPublishingAll ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Saving & Publishing to Loom...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>Confirm & Publish All to My Catalog</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResults(null);
                    setImages([]);
                    setImagePreviews([]);
                    setAudioBlob(null);
                  }}
                  className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition"
                >
                  Create More
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Floating CTA (upload view only) ── */}
        {!results && activeTab === "craft" && (
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-10 bg-gradient-to-t from-white via-white to-transparent flex flex-col gap-3 z-10">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2.5">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}
            <button
              onClick={generate}
              disabled={!canGenerate}
              className={`w-full py-4 rounded-2xl font-extrabold text-base transition-all flex justify-center items-center gap-2 shadow-xl ${canGenerate ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] shadow-indigo-600/30" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
            >
              {isLoading ? (
                <><Loader2 className="animate-spin" size={22} /> {loadingMsg || "Generating..."}</>
              ) : !artisanId ? (
                <>{t('sign_in_to_generate')} <User size={18} /></>
              ) : (
                <>{t('generate_btn')} <Sparkles size={18} /></>
              )}
            </button>
          </div>
        )}

        {/* ── Toast ── */}
        {toastMsg && (
          <div className="absolute bottom-24 left-5 right-5 bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xl z-30 animate-in slide-in-from-bottom-4 duration-300">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" /> {toastMsg}
          </div>
        )}
        {/* ── Profile Modal ── */}
        {isProfileOpen && artisanId && (
          <div className="absolute inset-0 z-50 bg-[#F9F8F6] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-stone-200 bg-white/90 backdrop-blur-md">
              <h2 className={`text-xl font-semibold text-neutral-900 ${playfair.className}`}>{t('profile_settings')}</h2>
              <button onClick={() => setIsProfileOpen(false)} className="p-2 text-neutral-500 hover:bg-stone-100 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
              <div className="flex flex-col items-center mb-10">
                <div className="w-24 h-24 rounded-full bg-neutral-900 text-[#F9F8F6] flex items-center justify-center text-3xl font-serif mb-4 shadow-lg border-4 border-stone-100">
                  {localName ? localName.charAt(0).toUpperCase() : "A"}
                </div>
                <h3 className={`text-2xl text-neutral-900 font-bold ${playfair.className}`}>
                  {localName || "Artisan"}
                </h3>
                <p className="text-neutral-500 text-sm mt-1">Verified Member</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">{t('display_name')}</label>
                  <input 
                    type="text" 
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-stone-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">{t('whatsapp_number_label')}</label>
                  <input 
                    type="tel" 
                    value={localWhatsapp}
                    onChange={(e) => setLocalWhatsapp(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3.5 bg-white border border-stone-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 transition shadow-sm text-sm"
                  />
                  <p className="text-xs text-neutral-400 mt-1.5 ml-1">Orders and buyer inquiries on your storefront will be sent here.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">{t('upi_id_label')}</label>
                  <input 
                    type="text" 
                    value={localUpi}
                    onChange={(e) => setLocalUpi(e.target.value)}
                    placeholder={t('upi_id_placeholder')}
                    className="w-full px-4 py-3.5 bg-white border border-stone-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 transition shadow-sm text-sm"
                  />
                  <p className="text-xs text-neutral-400 mt-1.5 ml-1">Receive direct zero-commission UPI payments from customers.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-2">
                    PayPal Email (For International Sales)
                  </label>
                  <input 
                    type="email" 
                    value={localPaypal}
                    onChange={(e) => setLocalPaypal(e.target.value)}
                    placeholder="e.g. artisan-seller@sandbox.paypal.com"
                    className="w-full px-4 py-3.5 bg-white border border-stone-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 transition shadow-sm text-sm"
                  />
                  <p className="text-xs text-neutral-400 mt-1.5 ml-1">Receive international USD export orders directly via PayPal Sandbox.</p>
                </div>

                {userRole === "artisan" && (
                  <>
                    <div className="pt-4 pb-2 border-t border-stone-200">
                      <h4 className={`text-lg font-bold text-neutral-900 mb-4 ${playfair.className}`}>{t('my_store_link')}</h4>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${artisanId}`}
                          readOnly
                          className="flex-1 px-4 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-neutral-600 text-sm overflow-hidden"
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/shop/${artisanId}`);
                            showToast("Link copied to clipboard!");
                          }}
                          className="px-4 py-3.5 bg-neutral-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition active:scale-95 shrink-0"
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 pb-6 border-t border-stone-200">
                      <h4 className={`text-base font-bold text-neutral-900 mb-3 text-center ${playfair.className}`}>Shop QR Code</h4>
                      <div className="flex flex-col items-center p-3.5 bg-white border border-stone-200 rounded-2xl shadow-sm max-w-[210px] mx-auto">
                        <div className="w-32 h-32 flex items-center justify-center bg-white rounded-xl">
                          <QRCodeCanvas 
                            id="shop-qr-code" 
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${artisanId}`} 
                            size={120} 
                            bgColor={"#ffffff"}
                            fgColor={"#171717"}
                            level={"H"}
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const canvas = document.getElementById("shop-qr-code") as HTMLCanvasElement;
                            if (!canvas) return;
                            const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                            const downloadLink = document.createElement("a");
                            downloadLink.href = pngUrl;
                            downloadLink.download = "shop-qr-code.png";
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);
                          }}
                          className="mt-3 w-full py-2 bg-stone-100 text-neutral-900 border border-stone-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-stone-200 transition"
                        >
                          <Download size={14} /> Download QR
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 pt-5 pb-9 sm:pb-8 bg-white border-t border-stone-200 flex flex-col gap-3 w-full">
              {/* Primary Action: Save Changes */}
              <button 
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full h-11 bg-neutral-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition shadow-sm active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSavingProfile ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                {t('save_changes')}
              </button>

              {/* Secondary Action: Browse Marketplace */}
              <button 
                onClick={() => {
                  setIsProfileOpen(false);
                  router.push("/shop");
                }}
                className="w-full h-11 bg-white text-neutral-800 border border-stone-300 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-50 hover:border-stone-400 transition active:scale-[0.99]"
              >
                <ShoppingBag size={18} className="text-neutral-600" />
                Browse Marketplace
              </button>

              {/* Destructive / Tertiary Action: Sign Out */}
              <button 
                onClick={() => {
                  setIsProfileOpen(false);
                  handleSignOut();
                }}
                className="w-full h-11 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-100/80 hover:text-red-700 transition active:scale-[0.99]"
              >
                <LogOut size={18} />
                {t('sign_out')}
              </button>
            </div>
          </div>
        )}

        {/* Custom Delete Confirmation Modal */}
        {productToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200 border border-stone-200">
              <h3 className={`text-lg font-serif font-bold text-stone-900 mb-2 ${playfair.className}`}>Delete Creation</h3>
              <p className="text-sm text-stone-600 mb-6 font-light">
                Are you sure you want to remove this item from your catalog? This action cannot be undone.
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => setProductToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : null}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
