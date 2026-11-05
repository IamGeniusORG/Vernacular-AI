import React from "react";

export function ArtisanProfileSkeleton() {
  return (
    <div className="w-full bg-white rounded-2xl md:rounded-3xl overflow-hidden border border-stone-200/90 shadow-2xs animate-pulse select-none">
      {/* MOBILE COMPACT ROW SKELETON (block md:hidden) */}
      <div className="flex md:hidden items-center justify-between p-2.5 sm:p-3 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar 48x48 */}
          <div className="w-12 h-12 rounded-full bg-stone-200 shrink-0"></div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-4 bg-stone-200 rounded w-28"></div>
              <div className="h-4 bg-stone-200/70 rounded-full w-14"></div>
            </div>
            <div className="h-3 bg-stone-200/60 rounded w-20"></div>
          </div>
        </div>
        <div className="h-6 w-16 bg-stone-200 rounded-full shrink-0"></div>
      </div>

      {/* DESKTOP FULL CARD SKELETON (hidden md:flex md:flex-col) */}
      <div className="hidden md:flex md:flex-col justify-between h-full">
        <div>
          {/* Banner image placeholder */}
          <div className="h-44 w-full bg-stone-200 relative">
            <div className="absolute top-3 right-3 h-5 w-20 bg-stone-300/80 rounded-full"></div>
          </div>

          {/* Details below banner */}
          <div className="relative px-6 pb-6 pt-12 text-center flex flex-col items-center">
            {/* Centered avatar */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-stone-300 border-4 border-white shadow-md"></div>
            <div className="h-5 bg-stone-200 rounded w-36 mb-2"></div>
            <div className="h-3.5 bg-stone-200/70 rounded w-28 mb-3"></div>
            <div className="h-5 bg-stone-200/80 rounded-full w-24"></div>
          </div>
        </div>

        {/* Action bar */}
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
          <div className="h-3 bg-stone-200 rounded w-32"></div>
          <div className="h-3.5 w-3.5 bg-stone-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function ArtisanDirectorySkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 md:gap-8 md:space-y-0 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <ArtisanProfileSkeleton key={i} />
      ))}
    </div>
  );
}

export default ArtisanProfileSkeleton;
