import React from "react";

export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20 animate-pulse select-none">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-200/80 safe-pt-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="h-4 bg-stone-200 rounded w-28"></div>
          <div className="h-7 bg-stone-200 rounded-full w-40"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Main Aspect-[4/5] Hero View */}
            <div className="w-full aspect-[4/5] bg-stone-200 rounded-3xl overflow-hidden relative shadow-sm border border-stone-200/60">
              <div className="absolute top-4 left-4 h-6 w-24 bg-stone-300 rounded-full"></div>
            </div>

            {/* Thumbnail Carousel */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-20 h-24 rounded-xl bg-stone-200 shrink-0 border border-stone-200/80"
                ></div>
              ))}
            </div>
          </div>

          {/* Right Column: Details & Actions */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Artisan Micro-bar */}
              <div className="flex items-center gap-3 pb-3 border-b border-stone-200/70">
                <div className="w-10 h-10 rounded-full bg-stone-200 shrink-0"></div>
                <div className="space-y-1">
                  <div className="h-3.5 bg-stone-200 rounded w-28"></div>
                  <div className="h-2.5 bg-stone-200/70 rounded w-20"></div>
                </div>
              </div>

              {/* Title & Tag */}
              <div className="space-y-2">
                <div className="h-6 sm:h-8 bg-stone-200 rounded w-4/5"></div>
                <div className="h-5 sm:h-6 bg-stone-200/80 rounded w-3/5"></div>
                <div className="h-5 bg-stone-200/70 rounded-full w-24 mt-2"></div>
              </div>

              {/* Price Block */}
              <div className="p-4 rounded-2xl bg-stone-100/80 border border-stone-200/70 space-y-2">
                <div className="h-7 bg-stone-300/80 rounded w-32"></div>
                <div className="h-3 bg-stone-200 rounded w-48"></div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <div className="h-12 w-full bg-emerald-200/80 rounded-2xl"></div>
                <div className="h-11 w-full bg-stone-200 rounded-2xl"></div>
              </div>

              {/* Story Section */}
              <div className="pt-4 space-y-2">
                <div className="h-4 bg-stone-200 rounded w-28"></div>
                <div className="h-3 bg-stone-200/80 rounded w-full"></div>
                <div className="h-3 bg-stone-200/80 rounded w-5/6"></div>
                <div className="h-3 bg-stone-200/80 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductDetailSkeleton;
