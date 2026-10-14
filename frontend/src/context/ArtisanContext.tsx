"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface ArtisanContextType {
  artisanId: string | null;
  profileName: string;
  profilePhone: string;
  whatsappNumber: string;
  upiId: string;
  userRole: string;
  setProfileName: (name: string) => void;
  setWhatsappNumber: (num: string) => void;
  setUpiId: (id: string) => void;
  setUserRole: (role: string) => void;
  saveProfile: (newName: string, newWhatsapp?: string, newUpi?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
}

const ArtisanContext = createContext<ArtisanContextType | undefined>(undefined);

export function ArtisanProvider({ children }: { children: React.ReactNode }) {
  const [artisanId, setArtisanId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [userRole, setUserRole] = useState("customer");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchProfileData = useCallback(async (userId: string) => {
    // 1. Try Supabase client query
    try {
      const { data } = await supabase
        .from("artisans")
        .select("full_name, phone_number, user_role, whatsapp_number, upi_id")
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

    async function initAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        if (mounted) setArtisanId(session.user.id);
        const profile = await fetchProfileData(session.user.id);

        if (profile && mounted) {
          setProfileName(profile.full_name || "New Artisan");
          setProfilePhone(profile.phone_number || "");
          setWhatsappNumber(profile.whatsapp_number || "");
          setUpiId(profile.upi_id || "");
          setUserRole(profile.user_role || "customer");
        }
      }
      if (mounted) setIsLoading(false);
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (mounted) setArtisanId(session.user.id);
        const profile = await fetchProfileData(session.user.id);

        if (profile && mounted) {
          setProfileName(profile.full_name || "New Artisan");
          setProfilePhone(profile.phone_number || "");
          setWhatsappNumber(profile.whatsapp_number || "");
          setUpiId(profile.upi_id || "");
          setUserRole(profile.user_role || "customer");
        }
      } else {
        if (mounted) {
          setArtisanId(null);
          setProfileName("");
          setProfilePhone("");
          setWhatsappNumber("");
          setUpiId("");
          setUserRole("customer");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfileData]);

  const saveProfile = async (newName: string, newWhatsapp?: string, newUpi?: string) => {
    if (!artisanId) return false;

    const payload: { full_name: string; whatsapp_number?: string; upi_id?: string } = {
      full_name: newName,
    };
    if (newWhatsapp !== undefined) payload.whatsapp_number = newWhatsapp;
    if (newUpi !== undefined) payload.upi_id = newUpi;

    // 1. Update via Backend API (service_role)
    try {
      await fetch(`${API_BASE}/api/v1/artisans/${artisanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("Backend saveProfile error:", err);
    }

    // 2. Update via Supabase client
    try {
      await supabase
        .from("artisans")
        .update(payload)
        .eq("id", artisanId);
    } catch (err) {
      console.warn("Supabase saveProfile error:", err);
    }

    setProfileName(newName);
    if (newWhatsapp !== undefined) setWhatsappNumber(newWhatsapp);
    if (newUpi !== undefined) setUpiId(newUpi);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setArtisanId(null);
    setProfileName("");
    setProfilePhone("");
    setWhatsappNumber("");
    setUpiId("");
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
        setProfilePhone(profile.phone_number || "");
        setWhatsappNumber(profile.whatsapp_number || "");
        setUpiId(profile.upi_id || "");
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
        userRole,
        setProfileName,
        setWhatsappNumber,
        setUpiId,
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
