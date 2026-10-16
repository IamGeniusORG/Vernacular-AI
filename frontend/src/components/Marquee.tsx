import React from "react";

export default function Marquee() {
  return (
    <div className="w-full overflow-hidden bg-stone-900 text-stone-50 py-2.5 border-b border-stone-800 flex whitespace-nowrap select-none">
      <div className="flex animate-marquee min-w-full shrink-0 items-center justify-around">
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">✨ 100% Direct-to-Weaver</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase text-amber-500">•</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">Zero Platform Commission</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase text-amber-500">•</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">Authentic Handcrafted Heritage ✨</span>
      </div>
      {/* Duplicate for seamless looping */}
      <div aria-hidden="true" className="flex animate-marquee min-w-full shrink-0 items-center justify-around">
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">✨ 100% Direct-to-Weaver</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase text-amber-500">•</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">Zero Platform Commission</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase text-amber-500">•</span>
        <span className="mx-8 text-xs sm:text-sm tracking-widest uppercase font-semibold">Authentic Handcrafted Heritage ✨</span>
      </div>
    </div>
  );
}
