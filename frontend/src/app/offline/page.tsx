"use client";

import React from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, ShoppingBag, ArrowLeft } from "lucide-react";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl space-y-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner">
          <WifiOff size={40} className="animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-[11px] font-extrabold tracking-wider uppercase bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
            No Internet Connection
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            You are offline
          </h1>
          <p className="text-sm font-medium text-slate-600 leading-relaxed">
            Connect to view this product and interact with the latest live creations from our artisans.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <button
            onClick={handleReload}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer text-sm"
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>

          <Link
            href="/shop"
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-6 rounded-2xl transition active:scale-95 text-sm"
          >
            <ShoppingBag size={16} />
            <span>Explore Cached Catalog</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition pt-2"
          >
            <ArrowLeft size={14} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>

      <div className="mt-8 text-xs font-medium text-slate-400">
        Vernacular AI PWA &bull; Offline Resilient Experience
      </div>
    </div>
  );
}
