/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, CheckCircle, Check, Share2, Loader2, Sparkles,
  ImagePlus, AudioLines, UploadCloud, AlertCircle, X, Plus, Minus, LogOut, User, Copy, Download, ShoppingBag,
  Trash2, RefreshCw, Camera, ExternalLink, ImageIcon,
  BarChart3, TrendingUp, Globe2, WifiOff, Heart, Eye, HeartCrack
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { playfair } from "@/lib/fonts";
import { useLanguage } from "@/context/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";
import { LanguageTransitionWrapper } from "@/components/LanguageTransitionProvider";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { Product } from "@/lib/api";
import { useArtisan } from "@/context/ArtisanContext";
import UniversalAvatar from "@/components/UniversalAvatar";
import UserDropdown from "@/components/UserDropdown";
import { uploadArtisanAsset } from "@/lib/uploadAsset";
import { revalidateArtisanProfile } from "@/app/actions/revalidate";
import { useOfflineSync, enqueueListing, fileToBase64, QueuedListing } from "@/lib/offlineQueue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function parseNumericSuggestedPrice(range?: string | null): number {
  if (!range) return 1500;
  const match = range.match(/\d[\d,]*/);
  if (!match) return 1500;
  const val = parseInt(match[0].replace(/,/g, ""), 10);
  return isNaN(val) || val <= 0 ? 1500 : val;
}

function generateOfflineId(): string {
  return "offline-" + Date.now();
}

function getTimestamp(): number {
  return Date.now();
}

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

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91 (India)" },
  { code: "+1", label: "🇺🇸 +1 (US / Canada)" },
  { code: "+44", label: "🇬🇧 +44 (UK)" },
  { code: "+880", label: "🇧🇩 +880 (Bangladesh)" },
  { code: "+971", label: "🇦🇪 +971 (UAE)" },
  { code: "+65", label: "🇸🇬 +65 (Singapore)" },
  { code: "+61", label: "🇦🇺 +61 (Australia)" },
  { code: "+49", label: "🇩🇪 +49 (Germany)" },
  { code: "+33", label: "🇫🇷 +33 (France)" },
  { code: "+81", label: "🇯🇵 +81 (Japan)" },
];

const parsePhoneNumber = (fullPhone?: string | null): { countryCode: string; localNumber: string } => {
  if (!fullPhone) return { countryCode: "+91", localNumber: "" };
  const s = fullPhone.trim();
  if (s.toLowerCase().includes("unknown") || s.toLowerCase() === "null") {
    return { countryCode: "+91", localNumber: "" };
  }
  const sortedCodes = ["+880", "+971", "+91", "+44", "+65", "+61", "+49", "+33", "+81", "+1"];
  for (const c of sortedCodes) {
    if (s.startsWith(c)) {
      const remainingDigits = s.slice(c.length).replace(/\D/g, "");
      return { countryCode: c, localNumber: remainingDigits };
    }
  }
  if (s.startsWith("+")) {
    const digits = s.slice(1).replace(/\D/g, "");
    return { countryCode: "+91", localNumber: digits };
  }
  const digits = s.replace(/\D/g, "");
  return { countryCode: "+91", localNumber: digits };
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const {
    artisanId,
    profileName,
    profilePhone,
    whatsappNumber,
    upiId,
    paypalEmail,
    avatarUrl,
    bannerUrl,
    qrCodeUrl,
    setAvatarUrl,
    setBannerUrl,
    setQrCodeUrl,
    userRole,
    setUserRole,
    saveProfile,
    logout,
    isLoading: authLoading
  } = useArtisan();
  const supabase = createClient();

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // Dedicated state handles customer accounts gracefully below without silent redirects
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isActivatingArtisan, setIsActivatingArtisan] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (!artisanId) return;
    setIsDeletingAccount(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const res = await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete account");
      }

      // Clear local auth & storage
      await logout();
      setIsDeleteAccountModalOpen(false);
      showToast("Your account and data have been permanently erased.");

      // Redirect cleanly to home page
      if (typeof window !== "undefined") {
        window.location.replace("/");
      } else {
        router.replace("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      showToast(msg);
      setIsDeletingAccount(false);
    }
  };

  const handleActivateArtisanRole = async () => {
    if (!artisanId) return;
    setIsActivatingArtisan(true);
    try {
      setUserRole("artisan");
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("user_role", "artisan");
        } catch {
          // ignore
        }
      }
      await supabase.auth.updateUser({ data: { user_role: "artisan" } });
      await supabase.from("artisans").upsert(
        {
          id: artisanId,
          user_role: "artisan",
          full_name: profileName || "Artisan Partner",
        },
        { onConflict: "id" }
      );
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ user_role: "artisan" }),
        });
      } catch {
        // ignore
      }
      showToast("Artisan Studio successfully activated!");
      router.refresh();
    } catch (err) {
      console.error("Activate artisan error:", err);
      showToast("Activated as Artisan!");
    } finally {
      setIsActivatingArtisan(false);
    }
  };
  
  // Local state for the input fields in the modal
  const [localName, setLocalName] = useState("");
  const [modalCountryCode, setModalCountryCode] = useState("+91");
  const [modalLocalPhone, setModalLocalPhone] = useState("");
  const [localUpi, setLocalUpi] = useState("");
  const [localPaypal, setLocalPaypal] = useState("");
  const [modalAvatarUrl, setModalAvatarUrl] = useState("");
  const [modalBannerUrl, setModalBannerUrl] = useState("");
  const [modalQrCodeUrl, setModalQrCodeUrl] = useState("");
  const [isUploadingModalAvatar, setIsUploadingModalAvatar] = useState(false);
  const [isUploadingModalBanner, setIsUploadingModalBanner] = useState(false);
  const [isUploadingModalQr, setIsUploadingModalQr] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const modalAvatarInputRef = useRef<HTMLInputElement>(null);
  const modalBannerInputRef = useRef<HTMLInputElement>(null);
  const modalQrInputRef = useRef<HTMLInputElement>(null);

  // Studio Navigation Tabs: "craft" | "catalog" | "branding" | "insights"
  const [activeTab, setActiveTab] = useState<"craft" | "catalog" | "branding" | "insights">("craft");
  const [products, setProducts] = useState<Product[]>([]);
  const inventory = products;
  const setInventory = setProducts;
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [isUpdatingPrice, setIsUpdatingPrice] = useState<Record<string, boolean>>({});
  const [isUpdatingStock, setIsUpdatingStock] = useState<Record<string, boolean>>({});
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  // Craft Tab Initial Pricing & Stock State
  const [uploadPrice, setUploadPrice] = useState<string>("");
  const [uploadStock, setUploadStock] = useState<number>(1);

  // Offline Synchronization & PWA State
  useNetworkStatus(showToast);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setAuthToken(session.access_token);
    });
  }, [supabase]);

  const handleSyncComplete = useCallback((res: { synced: number; failed: number }) => {
    showToast(`Synced ${res.synced} offline creation(s)!`);
  }, [showToast]);

  const {
    isOnline,
    queueCount,
    isQueueLoading,
    isSyncing,
    refreshQueueCount,
    triggerSync,
  } = useOfflineSync(authToken, handleSyncComplete);

  // Native PWA Installation State
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem("vernacular_install_dismissed") !== "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsAppInstalled(true);
        setShowInstallBanner(false);
        showToast("Studio App installed successfully!");
      }
      setDeferredPrompt(null);
    } else {
      showToast("To Install: Tap browser menu (⋮ or Share) ➔ 'Add to Home Screen'");
    }
  };

  const handleDismissInstallBanner = () => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem("vernacular_install_dismissed", "true");
    } catch {
      // ignore
    }
  };

  // Global Reach Analytics State
  interface AnalyticsData {
    total_views: number;
    unique_countries: number;
    top_countries: Array<{ country: string; views: number; percentage: number }>;
    recent_views: Array<{ country: string; city: string; created_at: string }>;
    tips_summary: { count: number; total_inr: number; total_usd: number };
  }
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Profile & Branding Dedicated Tab State
  const [brandingName, setBrandingName] = useState("");
  const [brandingCountryCode, setBrandingCountryCode] = useState("+91");
  const [brandingLocalPhone, setBrandingLocalPhone] = useState("");
  const [brandingUpi, setBrandingUpi] = useState("");
  const [brandingPaypal, setBrandingPaypal] = useState("");
  const [brandingAvatarUrl, setBrandingAvatarUrl] = useState("");
  const [brandingBannerUrl, setBrandingBannerUrl] = useState("");
  const [brandingQrCodeUrl, setBrandingQrCodeUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const brandingAvatarInputRef = useRef<HTMLInputElement>(null);
  const brandingBannerInputRef = useRef<HTMLInputElement>(null);
  const brandingQrInputRef = useRef<HTMLInputElement>(null);

  // Sync branding state when artisan context loads
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profileName) setBrandingName(profileName);
    const rawW = whatsappNumber || profilePhone || "";
    const parsed = parsePhoneNumber(rawW);
    setBrandingCountryCode(parsed.countryCode);
    setBrandingLocalPhone(parsed.localNumber);
    if (upiId) setBrandingUpi(upiId);
    if (paypalEmail) setBrandingPaypal(paypalEmail);
    if (avatarUrl) setBrandingAvatarUrl(avatarUrl);
    if (bannerUrl) setBrandingBannerUrl(bannerUrl);
    if (qrCodeUrl) setBrandingQrCodeUrl(qrCodeUrl);
  }, [profileName, whatsappNumber, profilePhone, upiId, paypalEmail, avatarUrl, bannerUrl, qrCodeUrl]);

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
      const parsed = parsePhoneNumber(rawW);
      setModalCountryCode(parsed.countryCode);
      setModalLocalPhone(parsed.localNumber);
      setLocalUpi(upiId || "");
      setLocalPaypal(paypalEmail || "");
      setModalAvatarUrl(avatarUrl || "");
      setModalBannerUrl(bannerUrl || "");
      setModalQrCodeUrl(qrCodeUrl || "");
    }
  }, [isProfileOpen, profileName, whatsappNumber, profilePhone, upiId, paypalEmail, avatarUrl, bannerUrl, qrCodeUrl]);

  // Asset upload helper supporting both modal and branding tab
  const handleUploadAsset = async (
    file: File,
    assetType: "avatar" | "banner" | "qr",
    isModal = false
  ) => {
    const targetId = user?.id || artisanId;
    if (!file || !targetId) return;

    if (isModal) {
      if (assetType === "avatar") setIsUploadingModalAvatar(true);
      else if (assetType === "banner") setIsUploadingModalBanner(true);
      else setIsUploadingModalQr(true);
    } else {
      if (assetType === "avatar") setIsUploadingAvatar(true);
      else if (assetType === "banner") setIsUploadingBanner(true);
      else setIsUploadingQr(true);
    }

    try {
      const res = await uploadArtisanAsset(targetId, file, assetType);
      if (res.success && res.url) {
        if (assetType === "avatar") {
          setBrandingAvatarUrl(res.url);
          setModalAvatarUrl(res.url);
          setAvatarUrl(res.url);
        } else if (assetType === "banner") {
          setBrandingBannerUrl(res.url);
          setModalBannerUrl(res.url);
          setBannerUrl(res.url);
        } else {
          setBrandingQrCodeUrl(res.url);
          setModalQrCodeUrl(res.url);
          setQrCodeUrl(res.url);
        }

        // Direct DB update so the asset is immediately saved to the artisan record
        const updateField =
          assetType === "avatar"
            ? { avatar_url: res.url }
            : assetType === "banner"
            ? { banner_url: res.url }
            : { qr_code_url: res.url };
        try {
          await supabase.from("artisans").update(updateField).eq("id", targetId);
        } catch (dbErr) {
          console.warn("Direct Supabase asset update notice:", dbErr);
        }

        try {
          await fetch(`${API_BASE}/api/v1/artisans/${targetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateField),
          });
        } catch (apiErr) {
          console.warn("Backend API asset save notice:", apiErr);
        }

        // Trigger Next.js cache revalidation for shop and public profile
        await revalidateArtisanProfile(targetId);
        router.refresh();

        const label =
          assetType === "avatar"
            ? "Profile photo"
            : assetType === "banner"
            ? "Cover photo"
            : "Payment QR code";
        showToast(`${label} uploaded & saved!`);
      } else {
        showToast(res.error || `Failed to upload ${assetType}`);
      }
    } catch (err) {
      console.error("Asset upload error:", err);
      showToast(`Error uploading ${assetType}`);
    } finally {
      if (isModal) {
        if (assetType === "avatar") setIsUploadingModalAvatar(false);
        else if (assetType === "banner") setIsUploadingModalBanner(false);
        else setIsUploadingModalQr(false);
      } else {
        if (assetType === "avatar") setIsUploadingAvatar(false);
        else if (assetType === "banner") setIsUploadingBanner(false);
        else setIsUploadingQr(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const targetId = user?.id || artisanId;
      const cleanDigits = modalLocalPhone.replace(/\D/g, "");
      const safeWhatsapp = cleanDigits ? `${modalCountryCode}${cleanDigits}` : "";

      if (targetId) {
        const payload: {
          full_name: string;
          whatsapp_number?: string;
          upi_id?: string;
          paypal_email?: string;
          avatar_url?: string;
          banner_url?: string;
          qr_code_url?: string;
        } = {
          full_name: localName.trim(),
          whatsapp_number: safeWhatsapp,
          upi_id: localUpi.trim(),
          paypal_email: localPaypal.trim(),
          avatar_url: modalAvatarUrl.trim(),
          banner_url: modalBannerUrl.trim(),
          qr_code_url: modalQrCodeUrl.trim(),
        };

        const { error } = await supabase
          .from("artisans")
          .update(payload)
          .eq("id", targetId);

        if (error) {
          console.warn("Direct Supabase update error:", error);
        }
      }

      const success = await saveProfile(
        localName.trim(),
        safeWhatsapp,
        localUpi.trim(),
        localPaypal.trim(),
        modalAvatarUrl.trim(),
        modalBannerUrl.trim(),
        modalQrCodeUrl.trim()
      );
      if (success) {
        await revalidateArtisanProfile(targetId);
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

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      const targetId = user?.id || artisanId;
      const cleanDigits = brandingLocalPhone.replace(/\D/g, "");
      const safeWhatsapp = cleanDigits ? `${brandingCountryCode}${cleanDigits}` : "";

      if (targetId) {
        const payload: {
          full_name: string;
          whatsapp_number?: string;
          upi_id?: string;
          paypal_email?: string;
          avatar_url?: string;
          banner_url?: string;
          qr_code_url?: string;
        } = {
          full_name: brandingName.trim(),
          whatsapp_number: safeWhatsapp,
          upi_id: brandingUpi.trim(),
          paypal_email: brandingPaypal.trim(),
          avatar_url: brandingAvatarUrl.trim(),
          banner_url: brandingBannerUrl.trim(),
          qr_code_url: brandingQrCodeUrl.trim(),
        };

        const { error } = await supabase
          .from("artisans")
          .update(payload)
          .eq("id", targetId);

        if (error) {
          console.warn("Direct Supabase update error:", error);
        }
      }

      const success = await saveProfile(
        brandingName.trim(),
        safeWhatsapp,
        brandingUpi.trim(),
        brandingPaypal.trim(),
        brandingAvatarUrl.trim(),
        brandingBannerUrl.trim(),
        brandingQrCodeUrl.trim()
      );

      if (success) {
        await revalidateArtisanProfile(targetId);
        router.refresh();
        showToast("Branding & Profile saved!");
      } else {
        showToast("Failed to save branding");
      }
    } catch (err) {
      console.error("Save branding error:", err);
      showToast("Error saving branding");
    } finally {
      setIsSavingBranding(false);
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

  const fetchAnalytics = useCallback(async () => {
    const targetUserId = user?.id || artisanId;
    if (!targetUserId) return;
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/analytics/artisan/${targetUserId}`);
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json);
      }
    } catch (e) {
      console.warn("Analytics fetch error:", e);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [user?.id, artisanId]);

  // ── Supabase Realtime Listener (Tips, Orders & Live Analytics State Hydration) ──
  useEffect(() => {
    const targetUserId = user?.id || artisanId;
    if (!targetUserId) return;

    const channel = supabase
      .channel(`artisan-realtime-feed-${targetUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tips",
          filter: `artisan_id=eq.${targetUserId}`,
        },
        (payload) => {
          const newTip = payload.new as {
            amount?: number;
            currency?: string;
            patron_name?: string;
          };
          const patronName = newTip.patron_name || "Generous Patron";
          const amount = Number(newTip.amount || 0);
          const curr = newTip.currency === "USD" ? "$" : "₹";
          showToast(`🎉 New tip received: ${curr}${amount} from ${patronName}!`);

          // Live Hydrate Analytics State Without Refresh
          setAnalytics((prev) => {
            if (!prev) return prev;
            const isUsd = newTip.currency === "USD";
            return {
              ...prev,
              tips_summary: {
                ...prev.tips_summary,
                count: (prev.tips_summary?.count || 0) + 1,
                total_inr: isUsd
                  ? prev.tips_summary?.total_inr || 0
                  : (prev.tips_summary?.total_inr || 0) + amount,
                total_usd: isUsd
                  ? (prev.tips_summary?.total_usd || 0) + amount
                  : prev.tips_summary?.total_usd || 0,
              },
            };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `artisan_id=eq.${targetUserId}`,
        },
        (payload) => {
          const newOrder = payload.new as {
            amount?: number;
            currency?: string;
            buyer_name?: string;
            payment_method?: string;
            status?: string;
          };
          const buyerName = newOrder.buyer_name || "Buyer";
          const amount = Number(newOrder.amount || 0);
          const curr = newOrder.currency === "USD" ? "$" : "₹";

          if (newOrder.status === "completed" || newOrder.payment_method === "paypal") {
            showToast(`🎉 New verified order: ${curr}${amount} from ${buyerName}!`);
          } else {
            showToast(`🔔 New pending UPI order: ₹${amount} from ${buyerName}. Please verify your bank app.`);
          }

          // Auto-refresh inventory so stock decrement is immediately visible
          fetchMyCatalog();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, artisanId, supabase, showToast, fetchMyCatalog]);

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

      // 1. Fire Supabase UPDATE query on price (with safe fallback if price_usd column isn't migrated)
      let { error: dbErr } = await supabase
        .from("products")
        .update({ price: finalPrice, price_inr: finalPrice, price_usd: finalUsd })
        .eq("id", product.product_id);

      if (dbErr && (dbErr.code === "PGRST204" || dbErr.message?.includes("price_usd"))) {
        const retry = await supabase
          .from("products")
          .update({ price: finalPrice, price_inr: finalPrice })
          .eq("id", product.product_id);
        dbErr = retry.error;
      }

      // 2. Also patch backend API to guarantee sync with session authorization
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        await fetch(`${API_BASE}/api/v1/products/${product.product_id}/price`, {
          method: "PATCH",
          headers,
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

        // Direct Supabase UPDATE with fallback
        const updateRes = await supabase
          .from("products")
          .update({ price: finalPrice, price_inr: finalPrice, price_usd: finalUsd, in_stock: true })
          .eq("id", product.product_id);

        if (updateRes.error && (updateRes.error.code === "PGRST204" || updateRes.error.message?.includes("price_usd"))) {
          await supabase
            .from("products")
            .update({ price: finalPrice, price_inr: finalPrice, in_stock: true })
            .eq("id", product.product_id);
        }

        try {
          await fetch(`${API_BASE}/api/v1/products/${product.product_id}/price`, {
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

  const handleAdjustStock = async (productId: string, newStock: number) => {
    const safeStock = Math.max(0, newStock);
    const isInStock = safeStock > 0;
    setIsUpdatingStock((prev) => ({ ...prev, [productId]: true }));

    // Optimistic local state update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stock_quantity: safeStock, in_stock: isInStock }
          : p
      )
    );

    try {
      // 1. Direct Supabase update with defensive column check
      const { error: dbErr } = await supabase
        .from("products")
        .update({ stock_quantity: safeStock, in_stock: isInStock })
        .eq("id", productId);

      if (dbErr && (dbErr.code === "PGRST204" || dbErr.message?.includes("stock_quantity"))) {
        await supabase
          .from("products")
          .update({ in_stock: isInStock })
          .eq("id", productId);
      }

      // 2. Patch backend API (which notifies subscribers if restocked 0 -> >0)
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      await fetch(`${API_BASE}/api/v1/products/${productId}/stock`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stock_quantity: safeStock }),
      });

      router.refresh();
      showToast(`Stock updated: ${safeStock} available`);
    } catch (err) {
      console.error("Failed to adjust stock:", err);
      showToast("Updated stock locally");
    } finally {
      setIsUpdatingStock((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleToggleStock = async (product: Product) => {
    const currentStock = typeof product.stock_quantity === "number" ? product.stock_quantity : (product.in_stock === false ? 0 : 1);
    const isCurrentlyInStock = product.in_stock !== false && currentStock > 0;
    const newStock = isCurrentlyInStock ? 0 : (currentStock > 0 ? currentStock : 1);
    await handleAdjustStock(product.id, newStock);
  };

  const handleShareCatalogProduct = async (product: Product) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const productUrl = `${origin}/shop/${product.artisan_id || artisanId}?product=${product.id}`;
    const shareTitle = product.ai_title_local || product.ai_title_en;
    const shareText = `Check out this handcrafted masterpiece "${product.ai_title_en}" on Vernacular AI`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: productUrl,
        });
        showToast("Link shared successfully!");
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(productUrl);
      showToast("Product link copied to clipboard!");
    } catch {
      showToast("Failed to copy link");
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

    // PWA Offline Studio Check: If offline, queue draft locally in IndexedDB
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoadingMsg("Rural Offline Mode: Saving draft to phone...");
      try {
        const queuedImages = await Promise.all(
          images.map(async (img) => ({
            name: img.name,
            type: img.type,
            base64: await fileToBase64(img),
          }))
        );

        let queuedAudio = undefined;
        if (audioBlob) {
          queuedAudio = {
            name: (audioBlob as File).name || "recording.webm",
            type: audioBlob.type || "audio/webm",
            base64: await fileToBase64(audioBlob),
          };
        }

        const offlineItem: QueuedListing = {
          id: generateOfflineId(),
          artisanId: currentArtisanId,
          images: queuedImages,
          audio: queuedAudio,
          language: "en",
          timestamp: getTimestamp(),
          manualPrice: uploadPrice ? parseInt(uploadPrice, 10) : undefined,
          stockQuantity: uploadStock || 1,
        };

        await enqueueListing(offlineItem);
        await refreshQueueCount();

        showToast("Saved offline! Listing will auto-sync once connected.");
        setImages([]);
        setImagePreviews([]);
        setAudioBlob(null);
        setUploadPrice("");
        setUploadStock(1);
      } catch (queueErr) {
        console.error("Offline save error:", queueErr);
        setErrorMsg("Failed to save draft offline.");
      } finally {
        setIsLoading(false);
        setLoadingMsg("");
      }
      return;
    }

    const formData = new FormData();
    formData.append("artisan_id", currentArtisanId);
    images.forEach((img) => formData.append("images", img));
    const audioMime = audioBlob.type || "audio/webm";
    const audioFilename = (audioBlob as File).name || (audioMime.includes("mp4") ? "recording.mp4" : "recording.webm");
    formData.append("audio", audioBlob, audioFilename);
    if (uploadPrice) {
      formData.append("manual_price", uploadPrice);
    }
    formData.append("stock_quantity", String(uploadStock || 1));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API_BASE}/api/v1/products/generate`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (res.status === 429) {
        showToast("Please wait a moment before trying again.");
        setErrorMsg("Please wait a moment before trying again.");
        return;
      }

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
      // Auto-fallback: if connection dropped during upload, save to offline queue
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        try {
          const queuedImages = await Promise.all(
            images.map(async (img) => ({
              name: img.name,
              type: img.type,
              base64: await fileToBase64(img),
            }))
          );
          const queuedAudio = audioBlob
            ? {
                name: (audioBlob as File).name || "recording.webm",
                type: audioBlob.type || "audio/webm",
                base64: await fileToBase64(audioBlob),
              }
            : undefined;

          await enqueueListing({
            id: generateOfflineId(),
            artisanId: currentArtisanId,
            images: queuedImages,
            audio: queuedAudio,
            language: "en",
            timestamp: getTimestamp(),
            manualPrice: uploadPrice ? parseInt(uploadPrice, 10) : undefined,
            stockQuantity: uploadStock || 1,
          });
          await refreshQueueCount();
          showToast("Network dropped. Saved draft to offline queue!");
          setImages([]);
          setImagePreviews([]);
          setAudioBlob(null);
          setUploadPrice("");
          setUploadStock(1);
          return;
        } catch {
          // ignore
        }
      }
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

  const reset = () => {
    setImages([]); setImagePreviews([]); setAudioBlob(null);
    setResults(null); setErrorMsg(null); setRecordingTime(0);
    setUploadPrice(""); setUploadStock(1);
  };

  const canGenerate = images.length > 0 && !!audioBlob && !isLoading;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (authLoading) {
    return <StudioSkeleton isOnline={isOnline} />;
  }

  // Customer Account View: gracefully explains that Studio tools are reserved for verified weavers
  if (artisanId && userRole === "customer") {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex flex-col justify-between font-sans text-neutral-900">
        <header className="px-6 py-4 border-b border-stone-200 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
          <Link href="/shop" className="flex items-center gap-2.5 group">
            <span className={`text-xl font-bold text-neutral-900 ${playfair.className}`}>Vernacular AI</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            <UserDropdown />
          </div>
        </header>

        <LanguageTransitionWrapper as="main" className="max-w-md mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShoppingBag size={28} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-3 inline-block">
            Patron / Buyer Account
          </span>
          <h1 className={`text-2xl font-bold text-neutral-900 mb-2 ${playfair.className}`}>
            Artisan Studio is Reserved for Weavers
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mb-6 leading-relaxed">
            You are signed in as a valued patron. The Studio features (voice catalog generation, direct UPI payout setup, and workshop branding) are reserved for verified weaver accounts.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={isActivatingArtisan}
              onClick={handleActivateArtisanRole}
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isActivatingArtisan ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              <span>I am an Artisan — Activate Weaver Studio</span>
            </button>
            <Link
              href="/profile"
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-md"
            >
              Go to Buyer Profile & Preferences
            </Link>
            <Link
              href="/shop"
              className="w-full py-3 bg-white hover:bg-stone-100 text-neutral-700 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold transition"
            >
              Browse Artisan Marketplace
            </Link>
            <Link
              href="/login"
              className="w-full py-2.5 text-xs text-neutral-500 hover:text-neutral-800 font-semibold transition"
            >
              Switch Account or Log In as Artisan
            </Link>
          </div>
        </LanguageTransitionWrapper>

        <footer className="py-6 text-center text-xs text-neutral-400 border-t border-stone-200 bg-white">
          Vernacular AI E-Commerce Enabler • 100% Direct Weaver Platform
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-6 font-sans">
      <main className="w-full min-h-screen md:min-h-0 md:h-[880px] md:max-w-[410px] bg-white md:rounded-[2.5rem] md:shadow-2xl flex flex-col relative overflow-hidden border-0 md:border-[8px] md:border-slate-800">

        {/* ── Mobile-Optimized Artisan Header ── */}
        <header className="px-3.5 sm:px-5 pt-3.5 sm:pt-6 pb-2.5 flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-20 gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
              title={isOnline ? "Studio Online" : "Studio Offline"}
            />
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 tracking-tight truncate">
              {t('header_title')}
            </h1>
            {!isOnline && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 border border-amber-300">
                <WifiOff size={10} /> Offline
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {!isAppInstalled && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-full text-[11px] sm:text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                title="Install Studio App on phone"
              >
                <Download size={12} className="shrink-0 text-amber-700" />
                <span>Install</span>
              </button>
            )}
            <LanguageToggle compact />
            <UserDropdown compact onOpenProfileDrawer={() => setIsProfileOpen(true)} />
          </div>
        </header>

        {/* ── Native PWA Install Banner for Rural Artisans ── */}
        {!isAppInstalled && showInstallBanner && (
          <div className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-white px-3.5 py-2 flex items-center justify-between text-xs font-medium shadow-xs shrink-0 z-20">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="p-1 bg-white/20 rounded-md shrink-0">
                <Download size={13} className="text-white" />
              </div>
              <span className="truncate text-[11px] sm:text-xs">
                <strong className="font-bold">Install Studio App:</strong> Works 100% offline in rural looms
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallPwa}
                className="bg-white text-amber-900 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs hover:bg-amber-50 transition cursor-pointer"
              >
                Install
              </button>
              <button
                type="button"
                onClick={handleDismissInstallBanner}
                className="p-1 hover:bg-white/20 rounded-full transition cursor-pointer text-white/80 hover:text-white"
                aria-label="Dismiss banner"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* ── Offline Status & Background Queue Status Banner ── */}
        {!isOnline && (
          <div className="w-full bg-amber-600 text-white text-[11px] font-semibold py-1.5 px-4 flex items-center justify-between shrink-0 shadow-xs z-30">
            <div className="flex items-center gap-1.5 truncate">
              <WifiOff size={13} className="shrink-0" />
              <span className="truncate">Offline Mode: Creations save locally</span>
            </div>
            {isQueueLoading ? (
              <span className="w-14 h-4 bg-amber-700/60 rounded-full animate-pulse shrink-0" />
            ) : queueCount > 0 ? (
              <span className="bg-amber-800 px-2 py-0.5 rounded-full text-[10px] shrink-0 font-bold">
                {queueCount} queued
              </span>
            ) : null}
          </div>
        )}
        {isOnline && (isQueueLoading ? (
          <div className="w-full bg-slate-100/90 py-1 px-4 flex items-center justify-between shrink-0">
            <div className="w-24 h-3 bg-slate-200 rounded animate-pulse" />
          </div>
        ) : queueCount > 0 ? (
          <div className="w-full bg-emerald-600 text-white text-[11px] font-semibold py-1.5 px-4 flex items-center justify-between shrink-0 shadow-xs z-30">
            <div className="flex items-center gap-1.5 truncate">
              <RefreshCw size={13} className={isSyncing ? "animate-spin shrink-0" : "shrink-0"} />
              <span className="truncate">
                {isSyncing ? "Syncing offline creations..." : `${queueCount} offline creation(s) ready`}
              </span>
            </div>
            <button
              onClick={() => triggerSync()}
              disabled={isSyncing}
              className="bg-emerald-800 hover:bg-emerald-900 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer shrink-0"
            >
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        ) : null)}

        {/* ── Segmented Navigation Control & Studio Body Wrapped with Language Transition ── */}
        <LanguageTransitionWrapper className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 sm:px-5 pt-2 pb-2 bg-white border-b border-slate-100 z-10 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 px-0.5 bg-slate-100/90 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("craft")}
                className={`shrink-0 flex-1 min-w-[76px] py-1.5 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "craft"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles size={13} className={activeTab === "craft" ? "text-amber-500" : ""} />
                <span>{t('tab_add_craft')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("catalog");
                  fetchInventory();
                }}
                className={`shrink-0 flex-1 min-w-[76px] py-1.5 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "catalog"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShoppingBag size={13} className={activeTab === "catalog" ? "text-indigo-600" : ""} />
                <span>{t('tab_my_catalog')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("insights");
                  fetchAnalytics();
                }}
                className={`shrink-0 flex-1 min-w-[76px] py-1.5 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "insights"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <BarChart3 size={13} className={activeTab === "insights" ? "text-emerald-600" : ""} />
                <span>Insights</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("branding")}
                className={`shrink-0 flex-1 min-w-[76px] py-1.5 px-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "branding"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <User size={13} className={activeTab === "branding" ? "text-amber-600" : ""} />
                <span>Profile</span>
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
                          {(item.in_stock === false || (typeof item.stock_quantity === "number" && item.stock_quantity <= 0)) && (
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

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleShareCatalogProduct(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Share Creation"
                          >
                            <Share2 size={16} />
                          </button>
                          <button
                            onClick={() => initiateDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title={t('delete_product')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom row: Inline Price Editor & Stock Management */}
                      <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2">
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
                              className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition active:scale-95 disabled:opacity-60 cursor-pointer"
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
                            disabled={isUpdatingStock[item.id]}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer ${
                              item.in_stock === false || (typeof item.stock_quantity === "number" && item.stock_quantity <= 0)
                                ? "bg-stone-100 text-stone-600 border border-stone-300 hover:bg-stone-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {isUpdatingStock[item.id] ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : item.in_stock === false || (typeof item.stock_quantity === "number" && item.stock_quantity <= 0) ? (
                              <>● {t('sold_out')}</>
                            ) : (
                              <>✓ {t('in_stock')}</>
                            )}
                          </button>
                        </div>

                        {/* Interactive Inventory Stock Counter */}
                        <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-600">Quantity Available:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(item.id, Math.max(0, (item.stock_quantity ?? (item.in_stock === false ? 0 : 1)) - 1))}
                              disabled={isUpdatingStock[item.id]}
                              className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold text-xs disabled:opacity-40 cursor-pointer"
                              title="Decrease stock"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-8 text-center text-xs font-black text-slate-900">
                              {typeof item.stock_quantity === "number" ? item.stock_quantity : (item.in_stock === false ? 0 : 1)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(item.id, (item.stock_quantity ?? (item.in_stock === false ? 0 : 1)) + 1)}
                              disabled={isUpdatingStock[item.id]}
                              className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold text-xs disabled:opacity-40 cursor-pointer"
                              title="Increase stock"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "branding" ? (

            /* ════════════════════ PROFILE & BRANDING VIEW ════════════════════ */
            <div className="space-y-6 pb-12 animate-in fade-in duration-200">
              {/* Section Heading */}
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Profile & Storefront Branding
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize how your artisan profile and craft card appear across the marketplace.
                </p>
              </div>

              {/* Optimistic Live Directory Card Preview */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <Sparkles size={12} /> Live Marketplace Card Preview
                  </span>
                  <span className="text-[10px] text-stone-400 font-medium">Auto-updates</span>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm relative pointer-events-none select-none">
                  {/* Top Banner */}
                  <div className="h-32 w-full relative overflow-hidden bg-stone-100">
                    {brandingBannerUrl || products[0]?.image_url ? (
                      <img
                        src={brandingBannerUrl || products[0]?.image_url}
                        alt="Banner preview"
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-300 opacity-60"></div>
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/woven-light.png')]"></div>
                      </>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10"></div>
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 bg-white/95 backdrop-blur-sm text-neutral-800 text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{products.length} {products.length === 1 ? "Creation" : "Creations"}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="relative px-4 pb-4 pt-9 text-center">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
                      <UniversalAvatar
                        name={brandingName || profileName || "Artisan"}
                        avatarUrl={brandingAvatarUrl}
                        size="lg"
                        className="border-4 border-white shadow-md ring-0"
                      />
                    </div>
                    <h3 className={`text-lg text-neutral-900 font-bold ${playfair.className}`}>
                      {brandingName || profileName || "Your Artisan Name"}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">West Bengal, India</p>
                    <div className="mt-2 inline-block px-2.5 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-semibold tracking-wider uppercase rounded-full">
                      Master Weaver
                    </div>
                  </div>
                </div>
              </div>

              {/* Hidden File Inputs */}
              <input
                type="file"
                ref={brandingAvatarInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadAsset(f, "avatar", false);
                }}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={brandingBannerInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadAsset(f, "banner", false);
                }}
                accept="image/*"
                className="hidden"
              />

              {/* Image Uploaders */}
              <div className="space-y-4">
                {/* Profile Photo Uploader */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Profile Picture (Avatar)
                    </label>
                    <span className="text-[10px] text-slate-400">Max 2MB (Auto-compressed)</span>
                  </div>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingAvatar(true); }}
                    onDragLeave={() => setIsDraggingAvatar(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingAvatar(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleUploadAsset(f, "avatar", false);
                    }}
                    onClick={() => brandingAvatarInputRef.current?.click()}
                    className={`p-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-3.5 ${
                      isDraggingAvatar
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 hover:border-slate-400 bg-slate-50/50"
                    }`}
                  >
                    <UniversalAvatar
                      name={brandingName || profileName}
                      avatarUrl={brandingAvatarUrl}
                      size="lg"
                      className="border-2 border-white shadow-sm shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">
                        {isUploadingAvatar ? "Uploading photo..." : "Click or drag photo here"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        JPG, PNG, WebP up to 2MB
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1 shrink-0"
                    >
                      {isUploadingAvatar ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                      <span>Upload</span>
                    </button>
                  </div>
                </div>

                {/* Cover Banner Uploader */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Storefront Cover Photo
                    </label>
                    <span className="text-[10px] text-slate-400">16:9 Landscape (Max 2MB)</span>
                  </div>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingBanner(true); }}
                    onDragLeave={() => setIsDraggingBanner(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingBanner(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleUploadAsset(f, "banner", false);
                    }}
                    onClick={() => brandingBannerInputRef.current?.click()}
                    className={`h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all relative overflow-hidden flex flex-col items-center justify-center ${
                      isDraggingBanner
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 hover:border-slate-400 bg-slate-50/50"
                    }`}
                  >
                    {brandingBannerUrl ? (
                      <img
                        src={brandingBannerUrl}
                        alt="Current banner"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-slate-400">
                        <UploadCloud size={24} />
                        <span className="text-xs font-medium">Click or drag cover banner image here</span>
                      </div>
                    )}
                    {isUploadingBanner && (
                      <div className="absolute inset-0 bg-black/60 text-white flex items-center justify-center gap-2 text-xs font-semibold">
                        <Loader2 size={16} className="animate-spin" /> Uploading banner...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Fields */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Artisan Profile Information
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={brandingName}
                    onChange={(e) => setBrandingName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp Number (Direct Domestic Inquiries)
                  </label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-slate-800 focus-within:border-transparent">
                    <select
                      value={brandingCountryCode}
                      onChange={(e) => setBrandingCountryCode(e.target.value)}
                      className="bg-slate-100/90 text-slate-800 text-xs font-semibold px-2.5 py-2.5 border-r border-slate-200 outline-none cursor-pointer hover:bg-slate-200/70 transition shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={brandingLocalPhone}
                      onChange={(e) => setBrandingLocalPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      className="flex-1 px-3.5 py-2.5 bg-transparent text-slate-900 text-xs outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Select country code and enter mobile number with no spaces or symbols.</p>
                </div>

                {/* Payment QR Code Uploader */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                      Payment QR Code (PhonePe / GPay / Paytm)
                    </label>
                    {brandingQrCodeUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Active QR
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Upload your actual payment QR code screenshot so patrons can scan and pay or tip you directly.
                  </p>

                  <input
                    ref={brandingQrInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadAsset(f, "qr", false);
                      e.target.value = "";
                    }}
                  />

                  {brandingQrCodeUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden shadow-xs">
                        <img
                          src={brandingQrCodeUrl}
                          alt="Artisan Payment QR"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">Official Payment QR</span>
                        <span className="text-[11px] text-slate-500 block truncate">Active for domestic patrons</span>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            disabled={isUploadingQr}
                            onClick={() => brandingQrInputRef.current?.click()}
                            className="text-[11px] font-bold text-slate-800 hover:text-black underline cursor-pointer"
                          >
                            {isUploadingQr ? "Uploading..." : "Replace QR"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setBrandingQrCodeUrl("")}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploadingQr}
                      onClick={() => brandingQrInputRef.current?.click()}
                      className="w-full p-3.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-amber-600 bg-slate-50 hover:bg-amber-50/30 cursor-pointer transition flex items-center justify-center gap-2 text-slate-600"
                    >
                      {isUploadingQr ? (
                        <Loader2 size={16} className="animate-spin text-amber-700" />
                      ) : (
                        <UploadCloud size={16} className="text-amber-700" />
                      )}
                      <span className="text-xs font-semibold">
                        {isUploadingQr ? "Uploading Payment QR..." : "Upload Payment QR Code"}
                      </span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={brandingUpi}
                    onChange={(e) => setBrandingUpi(e.target.value)}
                    placeholder="e.g. 9876543210@paytm or weaver@okhdfcbank"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Direct bank account UPI VPA for zero-commission instant settlement.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PayPal Email (Global USD Exports)
                  </label>
                  <input
                    type="email"
                    value={brandingPaypal}
                    onChange={(e) => setBrandingPaypal(e.target.value)}
                    placeholder="seller@sandbox.paypal.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSaveBranding}
                  disabled={isSavingBranding}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-md disabled:opacity-70"
                >
                  {isSavingBranding ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Save Branding & Profile
                </button>

                {artisanId && (
                  <button
                    type="button"
                    onClick={() => router.push(`/shop/${artisanId}`)}
                    className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <ExternalLink size={14} /> View Live Public Storefront
                  </button>
                )}

                {/* Danger Zone: Delete Account */}
                <div className="pt-6 mt-4 border-t border-slate-200">
                  <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 sm:p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-1">
                      Danger Zone
                    </h4>
                    <p className="text-[11px] sm:text-xs text-rose-700 leading-relaxed mb-3.5">
                      Permanently delete your artisan account, public storefront, products, and audio stories. This action cannot be reversed.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsDeleteAccountModalOpen(true)}
                      className="w-full py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                    >
                      <Trash2 size={15} /> Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "insights" ? (
            /* ════════════════════ INSIGHTS & ANALYTICS VIEW ════════════════════ */
            <div className="space-y-4 pb-12">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Business Insights & Global Reach
                  </h2>
                  <p className="text-xs text-slate-500">
                    Real-time visitor analytics & patronage metrics
                  </p>
                </div>
                <button
                  onClick={fetchAnalytics}
                  disabled={isLoadingAnalytics}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 transition active:scale-95"
                >
                  <RefreshCw size={12} className={isLoadingAnalytics ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>

              {isLoadingAnalytics && !analytics ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="animate-spin text-slate-400" size={28} />
                  <p className="text-xs font-medium">Loading store insights...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Metric Cards Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Total Views Card */}
                    <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Store Impressions</span>
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <Eye size={12} />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {analytics?.total_views || 0}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Global page impressions</p>
                    </div>

                    {/* Global Countries Card */}
                    <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Countries</span>
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <Globe2 size={12} />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {analytics?.unique_countries || 0}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Distinct territories</p>
                    </div>

                    {/* Patronage Tips INR Card */}
                    <div className="p-3.5 bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-2xl shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Domestic Tips</span>
                        <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                          <Heart size={12} className="fill-rose-600" />
                        </div>
                      </div>
                      <div className="text-xl font-black text-slate-900">
                        ₹{analytics?.tips_summary?.total_inr || 0}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Via UPI patronage</p>
                    </div>

                    {/* Patronage Tips USD Card */}
                    <div className="p-3.5 bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-2xl shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Export Tips</span>
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                          <Heart size={12} className="fill-amber-600" />
                        </div>
                      </div>
                      <div className="text-xl font-black text-slate-900">
                        ${analytics?.tips_summary?.total_usd || 0}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Via PayPal patrons</p>
                    </div>
                  </div>

                  {/* Top Countries Distribution */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-indigo-600" /> Top Visitor Geographies
                    </h3>
                    {analytics?.top_countries && analytics.top_countries.length > 0 ? (
                      <div className="space-y-2.5">
                        {analytics.top_countries.map((c, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span>{c.country}</span>
                              <span className="text-slate-500">{c.views} ({c.percentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(8, c.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-3 text-center">
                        No visitor data yet. Real-time impressions will appear here as buyers visit your store.
                      </p>
                    )}
                  </div>

                  {/* Recent Activity Log */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
                      <Globe2 size={13} className="text-emerald-600" /> Recent Global Visits
                    </h3>
                    {analytics?.recent_views && analytics.recent_views.length > 0 ? (
                      <div className="divide-y divide-slate-100 text-xs">
                        {analytics.recent_views.map((v, i) => (
                          <div key={i} className="py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="font-semibold text-slate-800">{v.country}</span>
                              {v.city && v.city !== "Unknown" && (
                                <span className="text-slate-400">({v.city})</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(v.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-2 text-center">No recent visits recorded.</p>
                    )}
                  </div>
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
                        type="button"
                        aria-label={isRecording ? "Recording voice note. Release to stop." : "Hold to record spoken handloom description"}
                        aria-pressed={isRecording}
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onMouseLeave={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        onKeyDown={(e) => {
                          if ((e.key === " " || e.key === "Enter") && !isRecording) {
                            e.preventDefault();
                            startRecording();
                          }
                        }}
                        onKeyUp={(e) => {
                          if ((e.key === " " || e.key === "Enter") && isRecording) {
                            e.preventDefault();
                            stopRecording();
                          }
                        }}
                        className={`w-18 h-18 w-20 h-20 rounded-full flex items-center justify-center text-white transition-all select-none shadow-xl cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-300 ${isRecording ? "bg-red-500 scale-95 shadow-red-400/50" : audioBlob ? "bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-700"}`}
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

              {/* Step 3 — Initial Pricing & Inventory */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">3</div>
                  <h2 className="text-base font-bold text-slate-800">Pricing & Inventory</h2>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Price (₹) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={uploadPrice}
                          onChange={(e) => setUploadPrice(e.target.value)}
                          placeholder="AI estimates"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Leave blank for AI suggested pricing</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Initial Stock
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => setUploadStock((s) => Math.max(0, s - 1))}
                          className="w-8 h-8 rounded-l-xl border border-r-0 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-sm cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={uploadStock}
                          onChange={(e) => setUploadStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-12 h-8 border border-slate-200 bg-white text-center text-xs font-bold text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setUploadStock((s) => s + 1)}
                          className="w-8 h-8 rounded-r-xl border border-l-0 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-sm cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Units available</p>
                    </div>
                  </div>
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
              className={`w-full py-4 rounded-2xl font-extrabold text-base transition-all flex justify-center items-center gap-2 shadow-xl ${
                canGenerate
                  ? isOnline
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] shadow-indigo-600/30 cursor-pointer"
                    : "bg-amber-600 text-white hover:bg-amber-700 hover:scale-[1.02] shadow-amber-600/30 cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <><Loader2 className="animate-spin" size={22} /> {loadingMsg || "Generating..."}</>
              ) : !artisanId ? (
                <>{t('sign_in_to_generate')} <User size={18} /></>
              ) : !isOnline ? (
                <>Save Draft (Offline) <WifiOff size={18} /></>
              ) : (
                <>{t('generate_btn')} <Sparkles size={18} /></>
              )}
            </button>
          </div>
        )}
        </LanguageTransitionWrapper>

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
              {/* Hidden file inputs for modal */}
              <input
                type="file"
                ref={modalAvatarInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadAsset(f, "avatar", true);
                }}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={modalBannerInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadAsset(f, "banner", true);
                }}
                accept="image/*"
                className="hidden"
              />

              <div className="flex flex-col items-center mb-6">
                <div
                  className="relative group cursor-pointer mb-2"
                  onClick={() => modalAvatarInputRef.current?.click()}
                >
                  <UniversalAvatar
                    name={localName}
                    avatarUrl={modalAvatarUrl || avatarUrl}
                    size="2xl"
                    className="border-4 border-white shadow-lg ring-0"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploadingModalAvatar ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Camera size={20} />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => modalAvatarInputRef.current?.click()}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 underline flex items-center gap-1 mb-1"
                >
                  {isUploadingModalAvatar ? "Uploading avatar..." : "Change profile photo"}
                </button>
                <h3 className={`text-2xl text-neutral-900 font-bold ${playfair.className}`}>
                  {localName || "Artisan"}
                </h3>
                <p className="text-neutral-500 text-xs mt-0.5">Verified Weaver</p>
              </div>

              {/* Cover Banner Box in Modal */}
              <div className="bg-white p-3.5 border border-stone-200 rounded-2xl mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Storefront Cover Banner
                  </span>
                  <button
                    type="button"
                    onClick={() => modalBannerInputRef.current?.click()}
                    className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1"
                  >
                    {isUploadingModalBanner ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                    <span>{modalBannerUrl ? "Replace" : "Upload"}</span>
                  </button>
                </div>
                <div
                  onClick={() => modalBannerInputRef.current?.click()}
                  className="h-24 w-full rounded-xl overflow-hidden bg-stone-100 border border-dashed border-stone-300 relative cursor-pointer hover:opacity-90 transition flex items-center justify-center group"
                >
                  {modalBannerUrl ? (
                    <img
                      src={modalBannerUrl}
                      alt="Store banner preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-neutral-400 group-hover:text-neutral-600">
                      <ImageIcon size={20} />
                      <span className="text-[11px] font-medium">Click to upload 16:9 banner</span>
                    </div>
                  )}
                  {isUploadingModalBanner && (
                    <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center gap-2 text-xs">
                      <Loader2 size={16} className="animate-spin" /> Uploading banner...
                    </div>
                  )}
                </div>
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
                  <div className="flex rounded-xl border border-stone-200 overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-neutral-800 transition">
                    <select
                      value={modalCountryCode}
                      onChange={(e) => setModalCountryCode(e.target.value)}
                      className="bg-stone-100 text-stone-800 text-sm font-semibold px-3 py-3.5 border-r border-stone-200 outline-none cursor-pointer hover:bg-stone-200/70 transition shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input 
                      type="tel" 
                      inputMode="numeric"
                      value={modalLocalPhone}
                      onChange={(e) => setModalLocalPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      className="flex-1 px-4 py-3.5 bg-transparent text-neutral-900 outline-none text-sm"
                    />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1.5 ml-1">Orders and buyer inquiries on your storefront will be sent here.</p>
                </div>

                {/* Official Payment QR Code (In place of demo shop QR) */}
                <div className="pt-2 pb-1 border-t border-stone-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-neutral-800">
                      Payment QR Code (PhonePe / GPay / Paytm)
                    </label>
                    {modalQrCodeUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Active QR
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mb-3">
                    Upload your actual payment QR code image so patrons can scan and send tips or instant payments.
                  </p>

                  <input
                    ref={modalQrInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadAsset(f, "qr", true);
                      e.target.value = "";
                    }}
                  />

                  {modalQrCodeUrl ? (
                    <div className="flex flex-col items-center p-3.5 bg-stone-50 border border-stone-200 rounded-2xl max-w-[220px] mx-auto mb-2">
                      <div className="w-36 h-36 bg-white p-2 rounded-xl border border-stone-200 flex items-center justify-center overflow-hidden shadow-xs">
                        <img
                          src={modalQrCodeUrl}
                          alt="Uploaded Payment QR"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-3 w-full">
                        <button
                          type="button"
                          disabled={isUploadingModalQr}
                          onClick={() => modalQrInputRef.current?.click()}
                          className="flex-1 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition"
                        >
                          {isUploadingModalQr ? "Uploading..." : "Replace QR"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalQrCodeUrl("")}
                          className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition"
                          title="Remove QR code"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploadingModalQr}
                      onClick={() => modalQrInputRef.current?.click()}
                      className="w-full p-4 border-2 border-dashed border-stone-300 hover:border-amber-600 rounded-2xl bg-stone-50 hover:bg-amber-50/40 transition flex flex-col items-center justify-center gap-2 text-center cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-amber-700 shadow-xs group-hover:scale-105 transition">
                        {isUploadingModalQr ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-800 block">
                          {isUploadingModalQr ? "Uploading Payment QR..." : "Upload Payment QR Code"}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          Screenshot from PhonePe, GPay, Paytm, or BHIM
                        </span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Real UPI ID under Payment QR */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-1.5">UPI ID</label>
                  <input 
                    type="text" 
                    value={localUpi}
                    onChange={(e) => setLocalUpi(e.target.value)}
                    placeholder="e.g. 9876543210@paytm or weaver@okhdfcbank"
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 transition shadow-sm text-sm"
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
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-800 transition shadow-sm text-sm"
                  />
                  <p className="text-xs text-neutral-400 mt-1.5 ml-1">Receive international USD export orders directly via PayPal Sandbox.</p>
                </div>

                {userRole === "artisan" && (
                  <div className="pt-4 pb-2 border-t border-stone-200">
                    <h4 className={`text-lg font-bold text-neutral-900 mb-4 ${playfair.className}`}>{t('my_store_link')}</h4>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${artisanId}`}
                        readOnly
                        className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-neutral-600 text-sm overflow-hidden"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/shop/${artisanId}`);
                          showToast("Link copied to clipboard!");
                        }}
                        className="px-4 py-3 bg-neutral-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition active:scale-95 shrink-0"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>
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

              {/* Delete Account Trigger */}
              <button 
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsDeleteAccountModalOpen(true);
                }}
                className="w-full h-11 bg-white text-rose-600 border border-rose-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-rose-50 hover:border-rose-300 transition active:scale-[0.99]"
              >
                <Trash2 size={16} />
                Delete Account
              </button>

              {/* Destructive / Tertiary Action: Sign Out */}
              <button 
                onClick={() => {
                  setIsProfileOpen(false);
                  handleSignOut();
                }}
                className="w-full h-11 bg-stone-50 text-stone-600 border border-stone-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-100 hover:text-stone-800 transition active:scale-[0.99]"
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

        {/* Sincere, Branded Account Deletion Confirmation Modal */}
        {isDeleteAccountModalOpen && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 flex flex-col items-center animate-in zoom-in-95 duration-200 relative text-center">
              
              {/* Close icon button */}
              <button
                type="button"
                onClick={() => !isDeletingAccount && setIsDeleteAccountModalOpen(false)}
                disabled={isDeletingAccount}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              {/* Emotional Branded Icon */}
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-inner">
                <HeartCrack size={32} className="stroke-[1.75]" />
              </div>

              {/* Title */}
              <h3 className={`text-xl sm:text-2xl text-stone-900 font-bold mb-2.5 ${playfair.className}`}>
                We&apos;re so sorry to see you go
              </h3>

              {/* Sincere message as requested */}
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-6 font-sans">
                We&apos;re so sorry to see you go. Deleting your account will permanently erase your storefront, audio stories, and catalog from Vernacular AI.
              </p>

              {/* Warning box */}
              <div className="w-full bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3.5 text-left mb-6">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-rose-800 leading-snug">
                    <span className="font-bold">Irreversible Action:</span> All uploaded images, weaver voice recordings, direct patronage tips, and catalog entries will be permanently erased.
                  </div>
                </div>
              </div>

              {/* Action Buttons: "Stay with us" and "Leave and Delete Data" */}
              <div className="w-full flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountModalOpen(false)}
                  disabled={isDeletingAccount}
                  className="w-full sm:flex-1 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer order-2 sm:order-1 disabled:opacity-50"
                >
                  Stay with us
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="w-full sm:flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer order-1 sm:order-2 disabled:opacity-70"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Deleting Data...</span>
                    </>
                  ) : (
                    <span>Leave and Delete Data</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function StudioSkeleton({ isOnline }: { isOnline: boolean }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-0 md:p-6 font-sans">
      <main className="w-full min-h-screen md:min-h-0 md:h-[880px] md:max-w-[410px] bg-white md:rounded-[2.5rem] md:shadow-2xl flex flex-col relative overflow-hidden border-0 md:border-[8px] md:border-slate-800 animate-pulse">
        {/* Header Skeleton */}
        <header className="px-3.5 sm:px-5 pt-3.5 sm:pt-6 pb-2.5 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2 flex-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
            <div className="h-4 w-32 bg-slate-200 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-12 bg-slate-200 rounded-full" />
            <div className="h-7 w-7 rounded-full bg-slate-200" />
          </div>
        </header>

        {/* Navigation Tabs Skeleton */}
        <div className="px-3 sm:px-5 pt-2 pb-2 bg-white border-b border-slate-100">
          <div className="flex items-center gap-1 py-1 px-1 bg-slate-100/90 rounded-xl">
            <div className="flex-1 h-7 bg-white rounded-lg shadow-xs" />
            <div className="flex-1 h-7 bg-slate-200/50 rounded-lg" />
            <div className="flex-1 h-7 bg-slate-200/50 rounded-lg" />
            <div className="flex-1 h-7 bg-slate-200/50 rounded-lg" />
          </div>
        </div>

        {/* Studio Content Skeleton */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Photo Dropzone Skeleton */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 bg-slate-200 rounded" />
            <div className="h-32 w-full border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="h-3 w-40 bg-slate-200 rounded" />
            </div>
          </div>

          {/* Voice Input Card Skeleton */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-slate-200 rounded" />
            <div className="h-24 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
                <div className="h-2.5 w-1/2 bg-slate-200 rounded" />
              </div>
            </div>
          </div>

          {/* Details / Pricing Inputs Skeleton */}
          <div className="space-y-2 pt-2">
            <div className="h-3.5 w-24 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="h-14 bg-slate-50 border border-slate-200 rounded-xl" />
            <div className="h-14 bg-slate-50 border border-slate-200 rounded-xl" />
          </div>
        </div>

        {/* Bottom Action Button Skeleton */}
        <div className="p-4 bg-white/90 backdrop-blur-md border-t border-slate-100">
          <div className="h-12 w-full bg-slate-200 rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
