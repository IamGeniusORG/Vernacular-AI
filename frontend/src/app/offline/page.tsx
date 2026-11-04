"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, ShoppingBag, ArrowLeft, Server, Loader2 } from "lucide-react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isCheckingServer, setIsCheckingServer] = useState<boolean>(false);
  const [pingAttempts, setPingAttempts] = useState<number>(0);

  useEffect(() => {
    const handleStatus = () => {
      const online = typeof navigator !== "undefined" ? navigator.onLine : true;
      setIsOnline(online);
    };

    handleStatus();
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);

    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  // Auto-refresh ping script: Silently pings /api/health every 5 seconds when online
  useEffect(() => {
    if (!isOnline) return;

    let active = true;
    let timer: NodeJS.Timeout;

    const pingServer = async () => {
      if (!active) return;
      setIsCheckingServer(true);
      try {
        const res = await fetch("/api/health", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok && active) {
          // Server returned 200 OK — automatically reload the page
          window.location.reload();
          return;
        }
      } catch {
        // Server still spinning up from cold start
      } finally {
        if (active) {
          setIsCheckingServer(false);
          setPingAttempts((prev) => prev + 1);
          timer = setTimeout(pingServer, 5000);
        }
      }
    };

    timer = setTimeout(pingServer, 1500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOnline]);

  const handleManualReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 text-center select-none">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl space-y-6">
        {/* Animated Status Icon */}
        <div
          className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center border shadow-inner transition-colors duration-300 ${
            isOnline
              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600"
              : "bg-amber-500/10 border-amber-500/20 text-amber-600"
          }`}
        >
          {isOnline ? (
            <Server size={38} className="animate-pulse" />
          ) : (
            <WifiOff size={38} className="animate-pulse" />
          )}
        </div>

        {/* Dynamic Header State */}
        <div className="space-y-2">
          {isOnline ? (
            <>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider uppercase bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping inline-block" />
                <span>Cloud Server Starting</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Waking up the artisan servers...
              </h1>
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                This may take a few seconds while our cloud instances spin up from standby. We will auto-reload the moment it is ready.
              </p>
              {pingAttempts > 0 && (
                <div className="pt-1 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
                  {isCheckingServer ? (
                    <Loader2 size={13} className="animate-spin text-indigo-500" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  )}
                  <span>Pinging server (Attempt #{pingAttempts})</span>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="inline-block text-[11px] font-extrabold tracking-wider uppercase bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                No Internet Connection
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                You are offline
              </h1>
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                Connect to view this product and interact with the latest live creations from our artisans.
              </p>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-2 space-y-3">
          <button
            onClick={handleManualReload}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-2xl transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer text-sm"
          >
            <RefreshCw size={16} className={isCheckingServer ? "animate-spin" : ""} />
            <span>{isOnline ? "Force Refresh Now" : "Try Again"}</span>
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
        Vernacular AI PWA &bull; Resilient Edge Architecture
      </div>
    </div>
  );
}
