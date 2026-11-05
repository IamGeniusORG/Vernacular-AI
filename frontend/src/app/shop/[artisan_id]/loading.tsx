import React from "react";
import { ProductGridSkeleton } from "@/components/skeletons/ProductCardSkeleton";

export default function LoadingStorefront() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans flex flex-col text-neutral-900">
      {/* Sticky Top Header Skeleton */}
      <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-200/90 safe-pt-header">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20 py-3.5 md:py-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-200"></div>
            <div className="space-y-1.5">
              <div className="h-4 bg-stone-200 rounded w-32"></div>
              <div className="h-3 bg-stone-200/70 rounded w-20"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-stone-200 rounded-full"></div>
            <div className="h-8 w-20 bg-stone-200 rounded-full"></div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20 py-8">
        {/* Hero Banner Skeleton */}
        <div className="w-full h-44 sm:h-56 md:h-72 rounded-3xl bg-stone-200 animate-pulse mb-8 border border-stone-200/80"></div>

        {/* Section Heading */}
        <div className="mb-6 animate-pulse">
          <div className="h-6 bg-stone-200 rounded w-48 mb-2"></div>
          <div className="h-3.5 bg-stone-200/70 rounded w-72"></div>
        </div>

        {/* 2-Column Mobile, 3-4 Column Desktop Skeleton Grid */}
        <ProductGridSkeleton count={8} />
      </main>
    </div>
  );
}
