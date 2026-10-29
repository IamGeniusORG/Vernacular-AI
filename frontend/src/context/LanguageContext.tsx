"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Language, dictionaries } from "@/i18n/dictionaries";

interface LanguageContextType {
  activeLanguage: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if present
  const [activeLanguage, setActiveLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user_preferred_language") as Language | null;
        if (stored === "en" || stored === "bn" || stored === "hi") {
          return stored;
        }
      } catch {}
    }
    return "en";
  });

  // Sync to localStorage and HTML tag when activeLanguage changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("user_preferred_language", activeLanguage);
      document.documentElement.lang = activeLanguage;
    } catch {}

    // Multi-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "user_preferred_language" && e.newValue) {
        if (e.newValue === "en" || e.newValue === "bn" || e.newValue === "hi") {
          setActiveLanguage(e.newValue as Language);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [activeLanguage]);

  const setLanguage = useCallback((lang: Language) => {
    setActiveLanguage(lang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("user_preferred_language", lang);
        document.documentElement.lang = lang;
      } catch {}
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (!key) return "";
      const currentDict = dictionaries[activeLanguage] || dictionaries.en;
      if (currentDict && currentDict[key]) {
        return currentDict[key];
      }
      // Fallback to English dictionary
      if (dictionaries.en && dictionaries.en[key]) {
        return dictionaries.en[key];
      }
      return fallback !== undefined ? fallback : key;
    },
    [activeLanguage]
  );

  return (
    <LanguageContext.Provider value={{ activeLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
