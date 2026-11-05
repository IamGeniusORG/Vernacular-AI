import React from "react";

export function ProductCardSkeleton() {
  return (
    <div className="group flex flex-col justify-between bg-white/80 rounded-2xl p-2 sm:p-3 border border-stone-200/80 shadow-2xs w-full h-full animate-pulse select-none">
      <div>
        {/* Aspect-[4/5] Hero Image Placeholder - Zero Layout Shift */}
        <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-stone-200/80 mb-2 sm:mb-3">
          <div className="absolute top-2 left-2 w-16 h-4 bg-stone-300/80 rounded-full"></div>
          <div className="absolute top-2 right-2 w-7 h-7 bg-stone-300/80 rounded-full"></div>
        </div>

        {/* Title Lines */}
        <div className="space-y-1.5 mb-2 sm:mb-3 px-0.5">
          <div className="h-3.5 bg-stone-200 rounded w-4/5"></div>
          <div className="h-3 bg-stone-200/70 rounded w-3/5"></div>
        </div>

        {/* Price & Currency Placeholder */}
        <div className="flex items-baseline gap-2 mb-2 sm:mb-3 px-0.5">
          <div className="h-4 bg-stone-300/80 rounded w-16"></div>
          <div className="h-3 bg-stone-200 rounded w-10"></div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-1.5 sm:gap-2 w-full pt-1">
        <div className="w-full h-8 sm:h-9 bg-stone-200 rounded-xl"></div>
        <div className="w-full h-8 sm:h-9 bg-stone-200/60 rounded-xl"></div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 md:gap-x-6 md:gap-y-12 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default ProductCardSkeleton;
