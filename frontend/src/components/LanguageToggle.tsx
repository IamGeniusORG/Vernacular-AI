"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Language } from "@/i18n/dictionaries";

interface LanguageToggleProps {
  compact?: boolean;
}

export default function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { activeLanguage, setLanguage } = useLanguage();

  const options: { id: Language; label: string; name: string }[] = [
    { id: "en", label: "A", name: "English" },
    { id: "bn", label: "অ", name: "বাংলা (Bengali)" },
    { id: "hi", label: "अ", name: "हिन्दी (Hindi)" },
  ];

  return (
    <div
      data-no-lang-transition
      className={`flex bg-stone-200/80 rounded-full shadow-inner relative border border-stone-300/70 select-none ${
        compact ? "p-0.5" : "p-1"
      }`}
      role="group"
      aria-label="Language Selector"
    >
      {options.map((option) => {
        const isActive = activeLanguage === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setLanguage(option.id)}
            title={option.name}
            aria-label={`Switch language to ${option.name}`}
            aria-pressed={isActive}
            className={`relative rounded-full flex items-center justify-center font-bold transition-all duration-300 z-10 cursor-pointer ${
              compact
                ? "w-6 h-6 text-xs"
                : "w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm"
            } ${
              isActive
                ? "text-white shadow-sm"
                : "text-neutral-700 hover:text-neutral-950 hover:bg-stone-300/40"
            }`}
          >
            {isActive && (
              <span className="absolute inset-0 bg-[#C85A32] rounded-full shadow-md z-[-1] animate-in fade-in duration-200" />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
