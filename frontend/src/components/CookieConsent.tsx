"use client";

import React, { useState, useEffect } from "react";
import { Cookie, ShieldCheck, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function CookieConsent() {
  const { activeLanguage } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const consent1 = localStorage.getItem("vernacular-cookie-consent");
      const consent2 = localStorage.getItem("vernacular_cookie_consent");
      const hasConsent =
        consent1 === "true" ||
        consent1 === "accepted" ||
        consent1 === "essential" ||
        consent2 === "true" ||
        consent2 === "accepted" ||
        consent2 === "essential";

      if (!hasConsent) {
        const timer = setTimeout(() => setIsVisible(true), 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage access restricted (e.g., incognito or sandboxed iframe)
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem("vernacular-cookie-consent", "true");
      localStorage.setItem("vernacular_cookie_consent", "true");
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem("vernacular-cookie-consent", "true");
      localStorage.setItem("vernacular_cookie_consent", "true");
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const content = {
    en: {
      title: "We value your privacy",
      description:
        "We use cookies and local storage to remember your language preferences, currency choices, and keep rural weaver sessions secure offline. We never sell your data or run third-party advertising trackers.",
      accept: "Accept All Cookies",
      essential: "Essential Only",
    },
    bn: {
      title: "আমরা আপনার গোপনীয়তাকে সম্মান করি",
      description:
        "আমরা আপনার ভাষা পছন্দ, মুদ্রা নির্বাচন মনে রাখতে এবং গ্রামীণ তাঁতিদের অফলাইন সেশন নিরাপদ রাখতে কুকিজ ও লোকাল স্টোরেজ ব্যবহার করি। আমরা কোনো বিজ্ঞাপন ট্র্যাকার ব্যবহার করি না।",
      accept: "সব কুকিজ গ্রহণ করুন",
      essential: "শুধুমাত্র প্রয়োজনীয়",
    },
    hi: {
      title: "हम आपकी गोपनीयता का सम्मान करते हैं",
      description:
        "हम आपकी भाषा प्राथमिकताओं, मुद्रा विकल्पों को याद रखने और ग्रामीण बुनकरों के ऑफ़लाइन सत्रों को सुरक्षित रखने के लिए कुकीज़ और लोकल स्टोरेज का उपयोग करते हैं। हम कभी भी विज्ञापन ट्रैकर्स का उपयोग नहीं करते हैं।",
      accept: "सभी कुकीज़ स्वीकार करें",
      essential: "केवल आवश्यक",
    },
  }[activeLanguage as "en" | "bn" | "hi"] || {
    title: "We value your privacy",
    description:
      "We use cookies and local storage to remember your language preferences, currency choices, and keep rural weaver sessions secure offline. We never sell your data or run third-party advertising trackers.",
    accept: "Accept All Cookies",
    essential: "Essential Only",
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie Consent Banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[999] bg-stone-900/95 text-white backdrop-blur-md border border-stone-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 select-none font-sans"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
          <Cookie size={18} />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>{content.title}</span>
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            </h3>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="text-stone-400 hover:text-white p-1 rounded-md transition cursor-pointer"
              aria-label="Close cookie banner"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-[11px] sm:text-xs text-stone-300 leading-relaxed mb-3.5">
            {content.description}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex-1 py-2 px-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer text-center"
            >
              {content.accept}
            </button>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="py-2 px-3 text-stone-300 hover:text-white hover:bg-stone-800 rounded-xl text-xs font-semibold transition cursor-pointer text-center shrink-0"
            >
              {content.essential}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
