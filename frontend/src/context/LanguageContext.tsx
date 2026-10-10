"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Language, dictionaries } from "@/i18n/dictionaries";

interface LanguageContextType {
  activeLanguage: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [activeLanguage, setActiveLanguage] = useState<Language>("en");

  const setLanguage = (lang: Language) => {
    setActiveLanguage(lang);
  };

  const t = (key: string): string => {
    const dict = dictionaries[activeLanguage];
    return dict[key] || key;
  };

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
