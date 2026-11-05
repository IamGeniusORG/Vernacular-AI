import React from "react";
import { ArtisanDirectorySkeleton } from "@/components/skeletons/ArtisanProfileSkeleton";

export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-[#F9F8F6] font-sans text-neutral-900 w-full overflow-x-hidden">
      {/* Sticky Top Header Skeleton */}
      <header className="w-full sticky top-0 z-40 bg-[#F9F8F6]/90 backdrop-blur-md border-b border-stone-200/90 safe-pt-header">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20 py-3.5 md:py-4 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-8 w-16 bg-stone-200 rounded-lg"></div>
            <div className="h-6 w-36 bg-stone-200 rounded"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-stone-200 rounded-full"></div>
            <div className="h-9 w-9 bg-stone-200 rounded-full"></div>
          </div>
        </div>
      </header>

      {/* Hero Placeholder */}
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 2xl:px-20 py-12 animate-pulse">
        <div className="h-8 bg-stone-200 rounded w-64 mx-auto mb-4"></div>
        <div className="h-4 bg-stone-200/70 rounded w-96 mx-auto mb-10 max-w-full"></div>

        {/* Directory Skeleton Grid */}
        <ArtisanDirectorySkeleton count={8} />
      </div>
    </div>
  );
}
