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
  userRole: string;
  setProfileName: (name: string) => void;
  setWhatsappNumber: (num: string) => void;
  setUpiId: (id: string) => void;
  setPaypalEmail: (email: string) => void;
  setAvatarUrl: (url: string) => void;
  setBannerUrl: (url: string) => void;
  setUserRole: (role: string) => void;
  saveProfile: (
    newName: string,
    newWhatsapp?: string,
    newUpi?: string,
    newPaypalEmail?: string,
    newAvatarUrl?: string,
    newBannerUrl?: string
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
  const [userRole, setUserRole] = useState("customer");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchProfileData = useCallback(async (userId: string) => {
    // 1. Try Supabase client query
    try {
      const { data } = await supabase
        .from("artisans")
        .select("full_name, phone_number, user_role, whatsapp_number, upi_id, paypal_email, avatar_url, banner_url")
        .eq("id", userId)
        .maybeSingle();

      if (data) return data;
    } catch (err) {
      console.warn("Client-side Supabase select error:", err);
    }

    // 2. Fallback to Backend API (uses service_role key to bypass RLS)
    try {
      const res = await fetch(`${API_BASE}/api/v1/artisans/${userId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        return json.artisan ?? null;
      }
    } catch (err) {
      console.error("Backend API profile lookup error:", err);
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

      // 1. Optimistic immediate population from OAuth session metadata
      setProfileName((prev) => prev || metaName);
      setAvatarUrl((prev) => prev || metaAvatar);

      // 2. Overlay persistent database profile
      const profile = await fetchProfileData(user.id);
      if (profile && mounted) {
        if (profile.full_name) setProfileName(profile.full_name);
        setProfilePhone(cleanPhone(profile.phone_number));
        setWhatsappNumber(cleanPhone(profile.whatsapp_number));
        setUpiId(profile.upi_id || "");
        setPaypalEmail(profile.paypal_email || "");
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        if (profile.banner_url) setBannerUrl(profile.banner_url);
        if (profile.user_role) setUserRole(profile.user_role);
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
  }, [supabase, fetchProfileData]);

  const saveProfile = async (
    newName: string,
    newWhatsapp?: string,
    newUpi?: string,
    newPaypalEmail?: string,
    newAvatarUrl?: string,
    newBannerUrl?: string
  ) => {
    if (!artisanId) return false;

    const payload: {
      full_name: string;
      whatsapp_number?: string;
      upi_id?: string;
      paypal_email?: string;
      avatar_url?: string;
      banner_url?: string;
    } = {
      full_name: newName.trim(),
    };
    if (newWhatsapp !== undefined) payload.whatsapp_number = cleanPhone(newWhatsapp);
    if (newUpi !== undefined) payload.upi_id = newUpi.trim();
    if (newPaypalEmail !== undefined) payload.paypal_email = newPaypalEmail.trim();
    if (newAvatarUrl !== undefined) payload.avatar_url = newAvatarUrl.trim();
    if (newBannerUrl !== undefined) payload.banner_url = newBannerUrl.trim();

    // 1. Update via Backend API with Supabase session auth token
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

    // 2. Update via Supabase client (with defensive fallback if columns not yet migrated)
    try {
      const { error: dbErr } = await supabase
        .from("artisans")
        .update(payload)
        .eq("id", artisanId);

      if (dbErr && (dbErr.code === "PGRST204" || dbErr.message?.includes("avatar_url") || dbErr.message?.includes("banner_url"))) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.avatar_url;
        delete fallbackPayload.banner_url;
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
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setArtisanId(null);
    setProfileName("");
    setProfilePhone("");
    setWhatsappNumber("");
    setUpiId("");
    setPaypalEmail("");
    setAvatarUrl("");
    setBannerUrl("");
    setUserRole("customer");
  };

  const refreshProfile = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const profile = await fetchProfileData(session.user.id);
      if (profile) {
        setProfileName(profile.full_name || "New Artisan");
        setProfilePhone(cleanPhone(profile.phone_number));
        setWhatsappNumber(cleanPhone(profile.whatsapp_number));
        setUpiId(profile.upi_id || "");
        setPaypalEmail(profile.paypal_email || "");
        setAvatarUrl(profile.avatar_url || "");
        setBannerUrl(profile.banner_url || "");
        setUserRole(profile.user_role || "customer");
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
        userRole,
        setProfileName,
        setWhatsappNumber,
        setUpiId,
        setPaypalEmail,
        setAvatarUrl,
        setBannerUrl,
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
