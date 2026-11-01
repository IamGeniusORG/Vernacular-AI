"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface ArtisanContextType {
  artisanId: string | null;
  profileName: string;
  profilePhone: string;
  whatsappNumber: string;
  upiId: string;
  paypalEmail: string;
  avatarUrl: string;
  bannerUrl: string;
  qrCodeUrl: string;
  userRole: string;
  setProfileName: (name: string) => void;
  setWhatsappNumber: (num: string) => void;
  setUpiId: (id: string) => void;
  setPaypalEmail: (email: string) => void;
  setAvatarUrl: (url: string) => void;
  setBannerUrl: (url: string) => void;
  setQrCodeUrl: (url: string) => void;
  setUserRole: (role: string) => void;
  saveProfile: (
    newName: string,
    newWhatsapp?: string,
    newUpi?: string,
    newPaypalEmail?: string,
    newAvatarUrl?: string,
    newBannerUrl?: string,
    newQrCodeUrl?: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
}

const cleanPhone = (val?: string | null): string => {
  if (!val) return "";
  const s = val.trim();
  if (
    s.toLowerCase().includes("unknown") ||
    s.toLowerCase() === "null" ||
    s.toLowerCase() === "undefined"
  ) {
    return "";
  }
  return s;
};

const ArtisanContext = createContext<ArtisanContextType | undefined>(undefined);

export function ArtisanProvider({ children }: { children: React.ReactNode }) {
  const [artisanId, setArtisanId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [userRole, setUserRoleState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("user_role") || localStorage.getItem("intended_role");
      if (cached === "artisan" || cached === "customer") return cached;
    }
    return "customer";
  });

  const setUserRole = useCallback((role: string) => {
    setUserRoleState(role);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("user_role", role);
      } catch {
        // ignore
      }
    }
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchProfileData = useCallback(async (userId: string) => {
    // 1. Try Supabase client query
    try {
      const { data, error } = await supabase
        .from("artisans")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (data && !error) return data;
    } catch (err) {
      console.warn("Client-side Supabase select error:", err);
    }

    // 2. Fallback to Backend API with circuit breaker timeout (uses service_role key to bypass RLS)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE}/api/v1/artisans/${userId}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        return json.artisan ?? null;
      }
    } catch (err) {
      console.warn("Backend API profile lookup notice:", err);
    }

    return null;
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    async function applyUserData(user: Session["user"]) {
      if (!user || !mounted) return;

      setArtisanId(user.id);
      const metaName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "Artisan";
      const metaAvatar =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        "";

      // 1. Optimistic immediate population from OAuth session metadata & storage
      const cachedRole =
        typeof window !== "undefined"
          ? localStorage.getItem("user_role") || localStorage.getItem("intended_role")
          : null;
      const metaRole = user.user_metadata?.user_role || (cachedRole === "artisan" ? "artisan" : null);

      setProfileName((prev) => prev || metaName);
      setAvatarUrl((prev) => prev || metaAvatar);
      if (metaRole) {
        setUserRole(metaRole);
      }
      if (user.user_metadata?.whatsapp_number) {
        setWhatsappNumber(cleanPhone(user.user_metadata.whatsapp_number));
      }
      if (user.user_metadata?.upi_id) {
        setUpiId(user.user_metadata.upi_id);
      }
      if (user.user_metadata?.paypal_email) {
        setPaypalEmail(user.user_metadata.paypal_email);
      }
      if (user.user_metadata?.banner_url) {
        setBannerUrl(user.user_metadata.banner_url);
      }
      if (user.user_metadata?.qr_code_url) {
        setQrCodeUrl(user.user_metadata.qr_code_url);
      }

      // 2. Overlay persistent database profile
      const profile = await fetchProfileData(user.id);
      if (profile && mounted) {
        if (profile.full_name) setProfileName(profile.full_name);
        if (profile.phone_number) setProfilePhone(cleanPhone(profile.phone_number));
        if (profile.whatsapp_number) setWhatsappNumber(cleanPhone(profile.whatsapp_number));
        if (profile.upi_id) setUpiId(profile.upi_id);
        if (profile.paypal_email) setPaypalEmail(profile.paypal_email);
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        if (profile.banner_url) setBannerUrl(profile.banner_url);
        if (profile.qr_code_url) setQrCodeUrl(profile.qr_code_url);
        if (profile.user_role) {
          setUserRole(profile.user_role);
        }
      }
    }

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await applyUserData(session.user);
        } else {
          // Direct fallback to getUser in case cookies were refreshed
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await applyUserData(user);
          }
        }
      } catch (err) {
        console.warn("initAuth notice:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      console.log(`[ArtisanContext] onAuthStateChange event: ${event}, user: ${session?.user?.id ?? "none"}`);
      if (session?.user) {
        await applyUserData(session.user);
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setArtisanId(null);
          setProfileName("");
          setProfilePhone("");
          setWhatsappNumber("");
          setUpiId("");
          setPaypalEmail("");
          setAvatarUrl("");
          setBannerUrl("");
          setUserRole("customer");
        }
      }
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfileData, setUserRole]);

  const saveProfile = async (
    newName: string,
    newWhatsapp?: string,
    newUpi?: string,
    newPaypalEmail?: string,
    newAvatarUrl?: string,
    newBannerUrl?: string,
    newQrCodeUrl?: string
  ) => {
    if (!artisanId) return false;

    const payload: {
      full_name: string;
      whatsapp_number?: string;
      upi_id?: string;
      paypal_email?: string;
      avatar_url?: string;
      banner_url?: string;
      qr_code_url?: string;
    } = {
      full_name: newName.trim(),
    };
    if (newWhatsapp !== undefined) payload.whatsapp_number = cleanPhone(newWhatsapp);
    if (newUpi !== undefined) payload.upi_id = newUpi.trim();
    if (newPaypalEmail !== undefined) payload.paypal_email = newPaypalEmail.trim();
    if (newAvatarUrl !== undefined) payload.avatar_url = newAvatarUrl.trim();
    if (newBannerUrl !== undefined) payload.banner_url = newBannerUrl.trim();
    if (newQrCodeUrl !== undefined) payload.qr_code_url = newQrCodeUrl.trim();

    // 1. Update Supabase Auth user_metadata directly from client (immediate auth persistence)
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: payload.full_name,
          ...(payload.whatsapp_number !== undefined && { whatsapp_number: payload.whatsapp_number }),
          ...(payload.upi_id !== undefined && { upi_id: payload.upi_id }),
          ...(payload.paypal_email !== undefined && { paypal_email: payload.paypal_email }),
          ...(payload.avatar_url !== undefined && { avatar_url: payload.avatar_url }),
          ...(payload.banner_url !== undefined && { banner_url: payload.banner_url }),
          ...(payload.qr_code_url !== undefined && { qr_code_url: payload.qr_code_url }),
        },
      });
    } catch (metaErr) {
      console.warn("Client auth metadata update error:", metaErr);
    }

    // 2. Update via Backend API with Supabase session auth token
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("Backend saveProfile error:", err);
    }

    // 3. Update via Supabase client (with defensive fallback if columns not yet migrated)
    try {
      const { error: dbErr } = await supabase
        .from("artisans")
        .update(payload)
        .eq("id", artisanId);

      if (dbErr) {
        const fallbackPayload: {
          full_name?: string;
          whatsapp_number?: string;
          upi_id?: string;
        } = {
          full_name: payload.full_name,
        };
        if (payload.whatsapp_number !== undefined) fallbackPayload.whatsapp_number = payload.whatsapp_number;
        if (payload.upi_id !== undefined) fallbackPayload.upi_id = payload.upi_id;
        await supabase.from("artisans").update(fallbackPayload).eq("id", artisanId);
      }
    } catch (err) {
      console.warn("Supabase saveProfile error:", err);
    }

    setProfileName(newName.trim());
    if (newWhatsapp !== undefined) setWhatsappNumber(cleanPhone(newWhatsapp));
    if (newUpi !== undefined) setUpiId(newUpi.trim());
    if (newPaypalEmail !== undefined) setPaypalEmail(newPaypalEmail.trim());
    if (newAvatarUrl !== undefined) setAvatarUrl(newAvatarUrl.trim());
    if (newBannerUrl !== undefined) setBannerUrl(newBannerUrl.trim());
    if (newQrCodeUrl !== undefined) setQrCodeUrl(newQrCodeUrl.trim());
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("user_role");
        localStorage.removeItem("intended_role");
      } catch {
        // ignore
      }
    }
    setArtisanId(null);
    setProfileName("");
    setProfilePhone("");
    setWhatsappNumber("");
    setUpiId("");
    setPaypalEmail("");
    setAvatarUrl("");
    setBannerUrl("");
    setQrCodeUrl("");
    setUserRole("customer");
  };

  const refreshProfile = async () => {
    let currentId = artisanId;
    let currentUser = null;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      currentId = session.user.id;
      currentUser = session.user;
    }

    if (currentUser?.user_metadata) {
      const meta = currentUser.user_metadata;
      if (meta.user_role) setUserRole(meta.user_role);
      if (meta.full_name) setProfileName(meta.full_name);
      if (meta.whatsapp_number) setWhatsappNumber(cleanPhone(meta.whatsapp_number));
      if (meta.upi_id) setUpiId(meta.upi_id);
      if (meta.paypal_email) setPaypalEmail(meta.paypal_email);
      if (meta.avatar_url) setAvatarUrl(meta.avatar_url);
      if (meta.banner_url) setBannerUrl(meta.banner_url);
      if (meta.qr_code_url) setQrCodeUrl(meta.qr_code_url);
    }

    if (currentId) {
      const profile = await fetchProfileData(currentId);
      if (profile) {
        if (profile.full_name) setProfileName(profile.full_name);
        if (profile.phone_number) setProfilePhone(cleanPhone(profile.phone_number));
        if (profile.whatsapp_number) setWhatsappNumber(cleanPhone(profile.whatsapp_number));
        if (profile.upi_id) setUpiId(profile.upi_id);
        if (profile.paypal_email) setPaypalEmail(profile.paypal_email);
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        if (profile.banner_url) setBannerUrl(profile.banner_url);
        if (profile.qr_code_url) setQrCodeUrl(profile.qr_code_url);
        if (profile.user_role) {
          setUserRole(profile.user_role);
        }
      }
    }
  };

  return (
    <ArtisanContext.Provider
      value={{
        artisanId,
        profileName,
        profilePhone,
        whatsappNumber,
        upiId,
        paypalEmail,
        avatarUrl,
        bannerUrl,
        qrCodeUrl,
        userRole,
        setProfileName,
        setWhatsappNumber,
        setUpiId,
        setPaypalEmail,
        setAvatarUrl,
        setBannerUrl,
        setQrCodeUrl,
        setUserRole,
        saveProfile,
        logout,
        refreshProfile,
        isLoading,
      }}
    >
      {children}
    </ArtisanContext.Provider>
  );
}

export function useArtisan() {
  const context = useContext(ArtisanContext);
  if (context === undefined) {
    throw new Error("useArtisan must be used within an ArtisanProvider");
  }
  return context;
}
