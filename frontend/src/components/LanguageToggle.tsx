"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Language } from "@/i18n/dictionaries";

export default function LanguageToggle() {
  const { activeLanguage, setLanguage } = useLanguage();

  const options: { id: Language; label: string }[] = [
    { id: "en", label: "A" },
    { id: "bn", label: "অ" },
    { id: "hi", label: "अ" },
  ];

  return (
    <div className="flex bg-stone-200 rounded-full p-1 shadow-inner relative">
      {options.map((option) => {
        const isActive = activeLanguage === option.id;
        return (
          <button
            key={option.id}
            onClick={() => setLanguage(option.id)}
            className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 z-10 ${
              isActive ? "text-white" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {isActive && (
              <span className="absolute inset-0 bg-indigo-600 rounded-full shadow-md z-[-1]" />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
