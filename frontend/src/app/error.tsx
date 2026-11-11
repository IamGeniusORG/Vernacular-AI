"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error captured:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-6 text-neutral-900 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200/90 shadow-xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#C85A32] flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
          <AlertCircle size={28} />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
          We encountered an unexpected error loading this page. Your data is safe.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>

          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-stone-100 hover:bg-stone-200 text-neutral-800 text-xs font-bold transition active:scale-95"
          >
            <Home size={14} />
            <span>Explore Marketplace</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
