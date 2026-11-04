"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";

export default function PwaUpdater() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshing = false;
    // When the controller changes (new service worker took over), reload the page once
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;

      // 1. If an updated worker is already in the waiting phase
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowPrompt(true);
      }

      // 2. Listen for newly discovered updates while browsing
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version installed and waiting to take over
            setWaitingWorker(newWorker);
            setShowPrompt(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    // Fallback reload if controllerchange takes longer than 600ms
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  if (!showPrompt) return null;

  return (
    <aside
      aria-label="Application Update Notice"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm"
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <p className="text-xs font-semibold leading-tight text-slate-100 truncate">
            New update available. Tap to refresh.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            <span>{isRefreshing ? "Updating..." : "Refresh"}</span>
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
            aria-label="Dismiss update notification"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
