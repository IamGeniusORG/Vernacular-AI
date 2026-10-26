"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { Language } from "@/i18n/dictionaries";

export type Currency = "INR" | "USD";

interface PreferencesContextType {
  currency: Currency;
  language: Language;
  setCurrency: (currency: Currency) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  formatPrice: (inr?: number | null, usd?: number | null) => string;
  isUpdating: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user_preferred_currency") as Currency | null;
        if (stored === "INR" || stored === "USD") return stored;
      } catch {}
    }
    return "INR";
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const { activeLanguage, setLanguage: setDictLanguage } = useLanguage();
  const supabase = createClient();

  // 1. Initial Supabase Auth & LocalStorage Hydration
  useEffect(() => {
    // Auth sync
    async function syncFromUser() {
      try {
        const storedLang = localStorage.getItem("user_preferred_language") as Language | null;
        if (storedLang === "en" || storedLang === "hi" || storedLang === "bn") {
          setDictLanguage(storedLang);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userMeta = session.user.user_metadata;
          if (userMeta?.preferred_currency === "USD" || userMeta?.preferred_currency === "INR") {
            setCurrencyState(userMeta.preferred_currency);
            try {
              localStorage.setItem("user_preferred_currency", userMeta.preferred_currency);
            } catch {}
          }
          if (userMeta?.preferred_language && ["en", "hi", "bn"].includes(userMeta.preferred_language)) {
            setDictLanguage(userMeta.preferred_language as Language);
            try {
              localStorage.setItem("user_preferred_language", userMeta.preferred_language);
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Preferences session hydration notice:", err);
      }
    }

    syncFromUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.user_metadata) {
        const userMeta = session.user.user_metadata;
        if (userMeta.preferred_currency === "USD" || userMeta.preferred_currency === "INR") {
          setCurrencyState(userMeta.preferred_currency);
          try {
            localStorage.setItem("user_preferred_currency", userMeta.preferred_currency);
          } catch {}
        }
        if (userMeta.preferred_language && ["en", "hi", "bn"].includes(userMeta.preferred_language)) {
          setDictLanguage(userMeta.preferred_language as Language);
          try {
            localStorage.setItem("user_preferred_language", userMeta.preferred_language);
          } catch {}
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, setDictLanguage]);

  // Persist currency preference
  const setCurrency = useCallback(async (newCurr: Currency) => {
    setCurrencyState(newCurr);
    try {
      localStorage.setItem("user_preferred_currency", newCurr);
    } catch {}

    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userId = session.user.id;

        // 1. Supabase Auth user_metadata update
        await supabase.auth.updateUser({
          data: { preferred_currency: newCurr },
        });

        // 2. Backend API sync (service_role)
        try {
          await fetch(`${API_BASE}/api/v1/artisans/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preferred_currency: newCurr }),
          });
        } catch (apiErr) {
          console.warn("Backend API currency sync notice:", apiErr);
        }

        // 3. Direct Supabase table update (best-effort)
        try {
          await supabase
            .from("artisans")
            .update({ preferred_currency: newCurr })
            .eq("id", userId);
        } catch (dbErr) {
          console.warn("Supabase artisans table currency update notice:", dbErr);
        }
      }
    } catch (err) {
      console.warn("setCurrency persistence error:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [supabase]);

  // Persist language preference
  const setLanguage = useCallback(async (newLang: Language) => {
    setDictLanguage(newLang);
    try {
      localStorage.setItem("user_preferred_language", newLang);
    } catch {}

    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userId = session.user.id;

        // 1. Supabase Auth user_metadata update
        await supabase.auth.updateUser({
          data: { preferred_language: newLang },
        });

        // 2. Backend API sync (service_role)
        try {
          await fetch(`${API_BASE}/api/v1/artisans/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preferred_language: newLang }),
          });
        } catch (apiErr) {
          console.warn("Backend API language sync notice:", apiErr);
        }

        // 3. Direct Supabase table update (best-effort)
        try {
          await supabase
            .from("artisans")
            .update({ preferred_language: newLang })
            .eq("id", userId);
        } catch (dbErr) {
          console.warn("Supabase artisans table language update notice:", dbErr);
        }
      }
    } catch (err) {
      console.warn("setLanguage persistence error:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [supabase, setDictLanguage]);

  // Universal formatPrice helper
  const formatPrice = useCallback((inr?: number | null, usd?: number | null): string => {
    if (currency === "USD") {
      if (usd != null && usd > 0) {
        return `$${usd.toFixed(2)}`;
      }
      if (inr != null && inr > 0) {
        const estimatedUsd = Math.round(Math.max(20, inr / 75));
        return `$${estimatedUsd.toFixed(2)}`;
      }
      return "$0.00";
    }

    // Default INR
    if (inr != null && inr > 0) {
      return `₹${inr.toLocaleString("en-IN")}`;
    }
    if (usd != null && usd > 0) {
      const estimatedInr = Math.round(usd * 80);
      return `₹${estimatedInr.toLocaleString("en-IN")}`;
    }
    return "₹0";
  }, [currency]);

  return (
    <PreferencesContext.Provider
      value={{
        currency,
        language: activeLanguage,
        setCurrency,
        setLanguage,
        formatPrice,
        isUpdating,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
